# Backened/Dockerfile
FROM python:3.11-slim

# Prevent Python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (this caches them to speed up future builds)
# Use requirements-docker.txt which excludes Windows-only packages
COPY requirements-docker.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . /app/

EXPOSE 8000

# Start with Daphne for HTTP + WebSocket support
CMD ["bash", "-c", "python manage.py migrate && daphne -b 0.0.0.0 -p 8000 printer.asgi:application"]