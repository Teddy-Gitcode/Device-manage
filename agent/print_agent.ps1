<#
.SYNOPSIS
    Ketepa Print Fleet Agent — captures Windows print events and POSTs them to the NOC API.

.DESCRIPTION
    Reads Event ID 307 from the Microsoft-Windows-PrintService/Operational log.
    Uses a registry key to track the last processed event time so each PC only
    sends new events on every run.  Deploy via GPO Scheduled Task on all domain PCs.

.NOTES
    GPO Scheduled Task settings:
      Trigger  : At logon + every 15 minutes
      Action   : powershell.exe -NonInteractive -ExecutionPolicy Bypass -File "\\<share>\print_agent.ps1"
      Run as   : SYSTEM  (or a dedicated service account with Event Log read rights)

    One-time setup per PC (or via GPO):
      Enable-NetFirewallRule -DisplayGroup "Windows Remote Management"
      wevtutil sl Microsoft-Windows-PrintService/Operational /e:true
#>

# ── Configuration ─────────────────────────────────────────────────────────────
$API_BASE  = 'http://10.0.0.1:8000/api/devices'   # <-- change to your Django server IP
$API_TOKEN = 'REPLACE_WITH_YOUR_API_TOKEN'         # <-- Token from .env.local
$LOG_NAME  = 'Microsoft-Windows-PrintService/Operational'
$REG_KEY   = 'HKLM:\SOFTWARE\KetepaPrintAgent'
$REG_VAL   = 'LastProcessedTime'

# ── Ensure PrintService operational log is enabled ────────────────────────────
try {
    $logCfg = Get-WinEvent -ListLog $LOG_NAME -ErrorAction Stop
    if (-not $logCfg.IsEnabled) {
        wevtutil sl $LOG_NAME /e:true | Out-Null
    }
} catch {
    Write-Warning "Cannot access log '$LOG_NAME': $_"
    exit 1
}

# ── Read last-run timestamp from registry ─────────────────────────────────────
$since = [datetime]::MinValue
if (Test-Path $REG_KEY) {
    $stored = (Get-ItemProperty -Path $REG_KEY -Name $REG_VAL -ErrorAction SilentlyContinue).$REG_VAL
    if ($stored) {
        try { $since = [datetime]::Parse($stored, $null, [System.Globalization.DateTimeStyles]::RoundtripKind) }
        catch { $since = [datetime]::MinValue }
    }
}

# ── Query new print events (Event ID 307 = job completed) ─────────────────────
$filterHash = @{
    LogName      = $LOG_NAME
    Id           = 307
    StartTime    = $since.AddSeconds(1)   # exclusive of last processed
}

try {
    $events = Get-WinEvent -FilterHashtable $filterHash -ErrorAction SilentlyContinue
} catch [System.Exception] {
    if ($_.Exception.Message -like '*No events*') {
        $events = @()
    } else {
        Write-Warning "Get-WinEvent failed: $_"
        exit 1
    }
}

if (-not $events -or $events.Count -eq 0) {
    exit 0
}

# ── Parse and POST each event ─────────────────────────────────────────────────
$headers = @{
    'Authorization' = "Token $API_TOKEN"
    'Content-Type'  = 'application/json'
}

$newestTime = $since
$posted     = 0
$failed     = 0

foreach ($evt in ($events | Sort-Object TimeCreated)) {

    # Event 307 XML structure:
    # <EventData>
    #   <Data Name="PrintJobId">...</Data>
    #   <Data Name="Param2">document name</Data>      (index 1)
    #   <Data Name="Param3">username</Data>           (index 2)  format: DOMAIN\user
    #   <Data Name="Param4">computer</Data>           (index 3)
    #   <Data Name="Param5">printer name</Data>       (index 4)
    #   <Data Name="Param6">printer port</Data>       (index 5)  e.g. "IP_192.168.1.50"
    #   <Data Name="Param7">total bytes</Data>        (index 6)
    #   <Data Name="Param8">pages printed</Data>      (index 7)
    # </EventData>

    try {
        $xml      = [xml]$evt.ToXml()
        $data     = $xml.Event.EventData.Data

        # Some builds use named attributes; fall back to positional
        function Get-EvtField([xml]$x, [string]$name, [int]$pos) {
            $node = $x.Event.EventData.Data | Where-Object { $_.Name -eq $name } | Select-Object -First 1
            if ($node) { return $node.'#text' }
            return ($x.Event.EventData.Data[$pos].'#text')
        }

        $docName  = Get-EvtField $xml 'Param2' 1
        $username = Get-EvtField $xml 'Param3' 2
        $computer = Get-EvtField $xml 'Param4' 3
        $prtName  = Get-EvtField $xml 'Param5' 4
        $prtPort  = Get-EvtField $xml 'Param6' 5
        $pages    = [int](Get-EvtField $xml 'Param8' 7)

        # Extract IP from port string: "IP_192.168.1.50" → "192.168.1.50"
        $printerIp = ''
        if ($prtPort -match 'IP[_\s]+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})') {
            $printerIp = $Matches[1]
        } elseif ($prtPort -match '(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})') {
            $printerIp = $Matches[1]
        }

        if (-not $printerIp) {
            # Skip USB / local / unknown port events
            continue
        }

        $body = @{
            printer_ip    = $printerIp
            printer_name  = $prtName
            username      = $username
            computer      = $computer
            document_name = $docName
            pages         = $pages
            printed_at    = $evt.TimeCreated.ToUniversalTime().ToString('o')
        } | ConvertTo-Json -Compress

        $resp = Invoke-RestMethod -Uri "$API_BASE/print-jobs/" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body `
                                  -ErrorAction Stop

        $posted++
        if ($evt.TimeCreated -gt $newestTime) { $newestTime = $evt.TimeCreated }

    } catch {
        $failed++
        # Log to Application event log so admins can see failures
        Write-EventLog -LogName Application -Source 'KetepaPrintAgent' `
                       -EventId 1001 -EntryType Warning `
                       -Message "Failed to POST print job: $_" -ErrorAction SilentlyContinue
    }
}

# ── Update registry with newest successfully processed time ──────────────────
if ($newestTime -gt $since) {
    if (-not (Test-Path $REG_KEY)) {
        New-Item -Path $REG_KEY -Force | Out-Null
    }
    Set-ItemProperty -Path $REG_KEY -Name $REG_VAL -Value $newestTime.ToUniversalTime().ToString('o')
}

Write-Host "KetepaPrintAgent: posted=$posted failed=$failed since=$since"
