"""One bounded live planner check with a project image, never a user desktop."""
import base64
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

endpoint = 'https://omyla.uwaaa.com/api/desktop-step'
try:
    urlopen(Request(endpoint, data=b'{}', headers={'Content-Type': 'application/json'}), timeout=20)
except HTTPError as error:
    if error.code != 400:
        raise RuntimeError(f'Unexpected validation status: {error.code}') from None
else:
    raise RuntimeError('Invalid input was not rejected')

image = base64.b64encode(Path('public/media/crew-cards.jpg').read_bytes()).decode('ascii')
payload = {'goal': 'この画像はキャラクター紹介画像です。PCの操作画面ではないため、kindをaskにして画面を見せてもらうように答えてください。', 'image': 'data:image/jpeg;base64,' + image, 'history': []}
try:
    with urlopen(Request(endpoint, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'}), timeout=90) as response:
        result = json.load(response)
except HTTPError as error:
    raise RuntimeError(f'Planner live check returned HTTP {error.code}') from None
action = result.get('action', {})
if action.get('kind') != 'ask' or not isinstance(action.get('summary'), str) or not action['summary'].strip():
    raise RuntimeError('Planner did not return the requested grounded ask action')
print('Live desktop endpoint: input validation and one vision-planner request passed.')
