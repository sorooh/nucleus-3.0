# sign_request.py
# Utility to compute HMAC SHA256 signature for Surooh API requests
import hmac
import hashlib
import json
import sys

def sign_payload(payload, secret):
    if not isinstance(payload, str):
        payload = json.dumps(payload, separators=(',', ':'))
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print('Usage: python sign_request.py "{\"key\":\"value\"}" "HMAC_SECRET"')
    else:
        payload, secret = sys.argv[1], sys.argv[2]
        print(sign_payload(payload, secret))
