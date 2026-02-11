#!/bin/bash
#
# clean-prom-data.sh
# Clears Prometheus time-series data without affecting configuration.
# Run on BrightSign player as root.
#

set -e

EXTENSION_NAME="promgraf"
BSEXT_INIT="/var/volatile/bsext/ext_${EXTENSION_NAME}/bsext_init"
PROMETHEUS_DATA="/storage/flash/prometheus/data"

echo "=== Prometheus Data Cleanup ==="

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: This script must be run as root"
    exit 1
fi

# Check if extension init script exists
if [ ! -x "${BSEXT_INIT}" ]; then
    echo "ERROR: Extension init script not found at ${BSEXT_INIT}"
    echo "Is the promgraf extension installed?"
    exit 1
fi

# Check if data directory exists
if [ ! -d "${PROMETHEUS_DATA}" ]; then
    echo "No Prometheus data directory found at ${PROMETHEUS_DATA}"
    echo "Nothing to clean."
    exit 0
fi

# Show current data size
echo "Current data size:"
du -sh "${PROMETHEUS_DATA}" 2>/dev/null || echo "  (empty or not accessible)"

# Stop the extension
echo ""
echo "Stopping ${EXTENSION_NAME} extension..."
${BSEXT_INIT} stop
sleep 2

# Clear the data directory contents (not the directory itself)
echo "Clearing Prometheus data at ${PROMETHEUS_DATA}..."
rm -rf "${PROMETHEUS_DATA:?}"/*

echo "Data cleared successfully."

# Restart the extension
echo ""
echo "Restarting ${EXTENSION_NAME} extension..."
${BSEXT_INIT} start

echo ""
echo "=== Cleanup Complete ==="
echo "Prometheus will now rebuild its TSDB from scratch."
