"""
Run python post_to_telegram.py

Mela Deals — Telegram auto-poster
----------------------------------
Reads your Google Sheet (published as CSV) and posts any row that hasn't
been posted yet to your Telegram channel.
"""  

import csv
import json
import os
import time
from io import StringIO
import requests
from dotenv import load_dotenv

# Load environmental variables from the local hidden .env file
load_dotenv()
print("What Python sees:", os.getenv("TELEGRAM_BOT_TOKEN"))

# Read configurations securely
SHEET_CSV_URL = os.getenv("URL_SHEET_DEALS")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")

POSTED_LOG = "posted_log.json"


def load_posted():
    if os.path.exists(POSTED_LOG):
        with open(POSTED_LOG) as f:
            return json.load(f)
    return []


def save_posted(posted_ids):
    with open(POSTED_LOG, "w") as f:
        json.dump(posted_ids, f, indent=2)


def fetch_deals():
    resp = requests.get(SHEET_CSV_URL, timeout=20)
    resp.raise_for_status()
    reader = csv.DictReader(StringIO(resp.text))
    return list(reader)


def compute_discount(original, sale):
    try:
        o = float(str(original).replace(",", "").replace("₹", "").strip())
        s = float(str(sale).replace(",", "").replace("₹", "").strip())
        if o > 0:
            return round((1 - s / o) * 100)
    except (ValueError, ZeroDivisionError):
        pass
    return None


def format_caption(deal):
    name = (deal.get("Product_Name") or "").strip()
    category = (deal.get("Category") or "").strip()
    original = (deal.get("Original_Price") or "").strip()
    sale = (deal.get("Sale_Price") or "").strip()
    link = (deal.get("Affiliate_Link") or "").strip()
    rating = (deal.get("Rating") or "").strip()
    review_count = (deal.get("Review_Count") or "").strip()

    discount = compute_discount(original, sale)

    lines = [f"🔥 *{name}*"]
    if category:
        lines.append(f"📦 {category}")

    if original and sale:
        price_line = f"~₹{original}~  ➜  *₹{sale}*"
        if discount:
            price_line += f"   ({discount}% OFF)"
    elif sale:
        price_line = f"*₹{sale}*"
    else:
        price_line = ""
    if price_line:
        lines.append(price_line)

    if rating:
        rating_line = f"⭐ {rating}"
        if review_count:
            rating_line += f" ({review_count} ratings)"
        lines.append(rating_line)

    specs = []
    for i in (1, 2, 3):
        label = (deal.get(f"Spec{i}_Label") or "").strip()
        value = (deal.get(f"Spec{i}_Value") or "").strip()
        if label and value:
            specs.append(f"{label}: {value}")
    if specs:
        lines.append(" • ".join(specs))

    lines.append(f"\n🛒 [Grab the deal]({link})")
    lines.append("\n_As an Amazon Associate, I earn from qualifying purchases._")
    return "\n".join(lines)


def send_to_telegram(deal):
    caption = format_caption(deal)
    image_url = (deal.get("Image_URL") or "").strip()
    api_base = f"https://api.telegram.org/bot{BOT_TOKEN}"

    if image_url:
        url = f"{api_base}/sendPhoto"
        payload = {
            "chat_id": CHANNEL_ID,
            "photo": image_url,
            "caption": caption,
            "parse_mode": "Markdown",
        }
    else:
        url = f"{api_base}/sendMessage"
        payload = {
            "chat_id": CHANNEL_ID,
            "text": caption,
            "parse_mode": "Markdown",
        }

    r = requests.post(url, data=payload, timeout=20)
    r.raise_for_status()
    return r.json()


def main():
    if not SHEET_CSV_URL or not BOT_TOKEN or not CHANNEL_ID:
        print("⚠️ Missing environment variables. Make sure your local .env file contains all parameters.")
        return

    posted = load_posted()
    deals = fetch_deals()
    new_count = 0

    for deal in deals:
        deal_id = (deal.get("S_No") or "").strip()
        if not deal_id or deal_id in posted:
            continue
        if not (deal.get("Product_Name") or "").strip():
            continue  # skip blank rows

        try:
            send_to_telegram(deal)
            posted.append(deal_id)
            new_count += 1
            print(f"✅ Posted deal #{deal_id}: {deal.get('Product_Name')}")
            time.sleep(2)  # be gentle on Telegram's rate limits
        except Exception as e:
            print(f"❌ Failed to post deal #{deal_id}: {e}")

    save_posted(posted)
    if new_count:
        print(f"\nDone — {new_count} new deal(s) posted to Telegram.")
    else:
        print("\nNo new deals to post. Add a row to your sheet and run this again.")


if __name__ == "__main__":
    main()