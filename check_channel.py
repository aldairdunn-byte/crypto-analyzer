import requests, json

r = requests.get('https://api.telegram.org/bot8897887741:AAFPzheKMItIIa6xNwn_ipd_pqZd_rLx9vU/getUpdates')
data = r.json()

print("=== ALL UPDATES WITH CHANNEL INFO ===")
for u in data.get('result', []):
    # Check my_chat_member
    mcm = u.get('my_chat_member', {})
    if mcm.get('chat', {}).get('type') == 'channel':
        chat = mcm['chat']
        print(f"  my_chat_member -> ID: {chat['id']}, Title: {chat.get('title')}, Type: {chat['type']}")
    
    # Check channel_post
    cp = u.get('channel_post', {})
    if cp.get('chat', {}).get('type') == 'channel':
        chat = cp['chat']
        print(f"  channel_post -> ID: {chat['id']}, Title: {chat.get('title')}, Type: {chat['type']}, Text: {cp.get('text', '')[:50]}")

# Also try sending a test message to verify
print("\n=== TESTING SEND TO CHANNEL ===")
test_r = requests.post(
    'https://api.telegram.org/bot8897887741:AAFPzheKMItIIa6xNwn_ipd_pqZd_rLx9vU/sendMessage',
    json={
        'chat_id': '-1004384607143',
        'text': 'TEST directo al canal',
        'parse_mode': 'HTML'
    }
)
print(f"Status: {test_r.status_code}")
print(f"Response: {json.dumps(test_r.json(), indent=2)}")
