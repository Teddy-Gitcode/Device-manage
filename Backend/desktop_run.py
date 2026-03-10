import os
import sys
import threading
import webview
from waitress import serve
from django.core.wsgi import get_wsgi_application

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_project_name.settings') # <--- Change to your project name
application = get_wsgi_application()

def start_server():
    # Start the Waitress server on localhost
    serve(application, host='127.0.0.1', port=8000)

if __name__ == '__main__':
    # 1. Start the web server in a separate thread so it doesn't block the UI
    t = threading.Thread(target=start_server)
    t.daemon = True
    t.start()

    # 2. Create the native window pointing to your local server
    webview.create_window('My Django App', 'http://127.0.0.1:8000')
    webview.start()