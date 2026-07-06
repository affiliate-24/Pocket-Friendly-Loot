**Pocket Friendly Loot** is a lightweight, fully static affiliate marketing website designed to operate entirely without a traditional backend server, database, or build pipeline.

Here is a high-level overview of the site's architecture and capabilities:

* **The Tech Stack:** The frontend is built using pure HTML, CSS, and vanilla JavaScript. Because it relies on no frameworks, it is extremely fast, highly portable, and can be hosted for free on any static provider (like Netlify or GitHub Pages).
* **The Database (Google Sheets):** Instead of a complex CMS, the entire website's content is powered by a single Google Sheets workbook containing seven relational tabs (like *Deals*, *Blogs*, and *Categories*). These tabs are published to the web as CSV files, which the JavaScript frontend fetches in real-time to populate the website.
* **Telegram Automation:** The system includes a Python script that acts as an automated bot. It watches the master "Deals" sheet and automatically publishes new products to a connected Telegram channel without requiring manual posting.
* **Streamlined Data Entry:** To make adding products faster, the site utilizes a custom web bookmarklet. When clicked on an Amazon product page, it automatically reads the product's title, price, and image, formatting the data so it can be instantly pasted into the Google Sheet.
* **Serverless Newsletter:** Email captures and newsletter sign-ups are handled seamlessly by pointing a frontend form directly to a Google Form, sending user responses straight into a private spreadsheet.

In short, it is a highly efficient, automated affiliate platform that uses Google Sheets as a database and Python for social media syndication, entirely wrapped in a simple vanilla web frontend.
