# Ketepa Print Agent — GPO Deployment Guide

This guide walks through everything needed to track who prints what, on which
computer, to which printer — across every domain PC — and have it appear in the
NOC dashboard at `http://<server>:3000/jobs` and `http://<server>:3000/users`.

---

## How it works

```
Domain PC  ──prints──►  Network Printer (IP)
    │
    │  Windows logs Event ID 307
    │  (PrintService/Operational)
    │
    ▼
print_agent.ps1   ──POST /api/devices/print-jobs/──►  Django backend
(runs every 15 min                                          │
 via GPO Task)                                              ▼
                                                    NOC Dashboard
                                              /jobs  /users  /devices
```

- **No print server needed** — the agent runs on each domain PC directly.
- **No duplicate data** — the agent saves its last-run timestamp in the registry
  so it only sends new events on each run.
- **Skips USB/local** — only captures jobs sent to a network IP port.

---

## Step 1 — Get your API token

On the machine running Docker, open a terminal and run:

```powershell
docker exec device-manage-backend-1 python manage.py shell -c "
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
u = User.objects.get(username='admin')
t, _ = Token.objects.get_or_create(user=u)
print(t.key)
"
```

Copy the token that prints out — you will need it in Step 2.

---

## Step 2 — Edit the script

Open `print_agent.ps1` and change the two lines at the top:

```powershell
$API_BASE  = 'http://10.0.0.1:8000/api/devices'   # ← your server's LAN IP
$API_TOKEN = 'paste-your-token-here'               # ← token from Step 1
```

> **Important:** use the server's actual LAN IP (e.g. `192.168.1.10`), not
> `localhost` — domain PCs need to reach it over the network.

Save the file.

---

## Step 3 — Copy the script to SYSVOL

Copy the edited `print_agent.ps1` to a path reachable by all domain PCs.
The SYSVOL share is ideal because every PC already has read access to it.

```
\\<your-domain-controller>\SYSVOL\<your-domain>\scripts\print_agent.ps1
```

Example for Ketepa:

```
\\KETEPA-DC\SYSVOL\ketepa.local\scripts\print_agent.ps1
```

If you do not have a `scripts` folder there, create it first.

---

## Step 4 — Create the GPO

1. Open **Group Policy Management** on the domain controller
   (`gpmc.msc` or Server Manager → Tools → Group Policy Management).

2. Right-click the OU that contains your domain computers
   (e.g. **Computers** or a custom OU) and choose
   **Create a GPO in this domain, and Link it here…**

3. Name it: `Ketepa Print Agent`

4. Right-click the new GPO → **Edit**

---

## Step 5 — Add a Scheduled Task inside the GPO

Inside the Group Policy Management Editor:

```
Computer Configuration
  └─ Preferences
       └─ Control Panel Settings
            └─ Scheduled Tasks
```

Right-click **Scheduled Tasks** → **New** → **Scheduled Task (At least Windows 7)**

### General tab

| Field | Value |
|---|---|
| Action | Create |
| Name | `KetepaPrintAgent` |
| Run as | `NT AUTHORITY\SYSTEM` |
| Run whether user is logged on or not | ✔ checked |
| Run with highest privileges | ✔ checked |
| Hidden | ✔ checked (optional, cleaner) |

### Triggers tab — Add two triggers

**Trigger 1 — run at startup:**

| Field | Value |
|---|---|
| Begin the task | At startup |
| Delay task for | 2 minutes (gives network time to connect) |
| Enabled | ✔ |

**Trigger 2 — repeat every 15 minutes:**

| Field | Value |
|---|---|
| Begin the task | On a schedule |
| Settings | Daily, starting today |
| Repeat task every | 15 minutes |
| For a duration of | Indefinitely |
| Enabled | ✔ |

### Actions tab — Add one action

| Field | Value |
|---|---|
| Action | Start a program |
| Program/script | `powershell.exe` |
| Add arguments | `-NonInteractive -ExecutionPolicy Bypass -File "\\KETEPA-DC\SYSVOL\ketepa.local\scripts\print_agent.ps1"` |

> Replace the UNC path with the exact path where you copied the script in Step 3.

### Settings tab (recommended)

| Field | Value |
|---|---|
| Allow task to be run on demand | ✔ |
| Run task as soon as possible after a scheduled start is missed | ✔ |
| If the task fails, restart every | 5 minutes, up to 3 times |
| Stop the task if it runs longer than | 5 minutes |

Click **OK** to save.

---

## Step 6 — Enable the PrintService event log via GPO (one-time)

The `Microsoft-Windows-PrintService/Operational` log is **disabled by default**
on most Windows builds. The agent script enables it automatically when it runs,
but you can also push this via GPO for faster rollout.

Inside the same GPO editor:

```
Computer Configuration
  └─ Preferences
       └─ Windows Settings
            └─ Registry
```

Right-click → **New** → **Registry Item**:

| Field | Value |
|---|---|
| Action | Update |
| Hive | `HKEY_LOCAL_MACHINE` |
| Key path | `SYSTEM\CurrentControlSet\Services\EventLog\Microsoft-Windows-PrintService%4Operational` |
| Value name | `Start` |
| Value type | `REG_DWORD` |
| Value data | `2` |

Alternatively, add a **Startup Script** (under Computer Configuration →
Windows Settings → Scripts → Startup) with this one-liner:

```powershell
wevtutil sl "Microsoft-Windows-PrintService/Operational" /e:true
```

---

## Step 7 — Force the GPO to apply (optional, for testing)

On any domain PC, open a Command Prompt as Administrator and run:

```cmd
gpupdate /force
```

Then either restart the PC or wait for the next scheduled task trigger.
To run the task immediately without waiting:

```cmd
schtasks /run /tn "KetepaPrintAgent"
```

---

## Step 8 — Verify data is arriving

1. Open the NOC dashboard: `http://<server>:3000/jobs`

2. If jobs appear, the agent is working.

3. To check directly on the backend:

```powershell
curl -H "Authorization: Token <your-token>" http://<server>:8000/api/devices/print-jobs/
```

You should see JSON with print job records.

4. To see per-user stats:

```powershell
curl -H "Authorization: Token <your-token>" http://<server>:8000/api/devices/print-jobs/user-stats/
```

---

## Troubleshooting

### No jobs appearing after GPO applies

Check on a domain PC:

```powershell
# 1. Is the PrintService log enabled?
Get-WinEvent -ListLog "Microsoft-Windows-PrintService/Operational" | Select IsEnabled

# 2. Are there any Event ID 307 entries at all?
Get-WinEvent -FilterHashtable @{LogName="Microsoft-Windows-PrintService/Operational"; Id=307} -MaxEvents 5

# 3. Did the task run?
Get-ScheduledTask -TaskName "KetepaPrintAgent" | Select TaskName, State, LastRunTime, LastTaskResult
```

### Task runs but no data sent — check Application Event Log

```powershell
Get-EventLog -LogName Application -Source "KetepaPrintAgent" -Newest 10
```

If you see errors there, they will describe exactly which step failed (network
unreachable, auth failure, etc.).

### 401 Unauthorized from the API

The token expired (Django restarted). Regenerate it (Step 1) and update the
script in SYSVOL. The GPO will push the updated script on the next `gpupdate`.

### Jobs show but printer is `null` in the database

The printer IP recorded in the Windows event does not match any printer IP in
the NOC database. Open the NOC, go to the device, and check the IP address
stored there matches what your PCs use to connect (some setups use a hostname
instead of an IP in the printer port name — in that case the agent will still
record the job, it just will not link it to a specific device record).

### Only some PCs are sending data

The GPO is probably not applied to all OUs. Open Group Policy Management and
check the **Scope** tab of the `Ketepa Print Agent` GPO — make sure it is
linked to every OU that contains workstations.

---

## Data visible in the dashboard

| Page | What you see |
|---|---|
| `/jobs` | Every print job: time, domain user, computer name, printer, document, pages |
| `/users` | Top 20 users by page count (30-day window) with cost and most-used printer |
| `/devices/[id]` | Print volume chart and page totals for that specific printer |

The `/jobs` page has a period filter (Last 24 h / 7 days / 30 days) and a
search box that searches across user, computer, printer, and document name.
