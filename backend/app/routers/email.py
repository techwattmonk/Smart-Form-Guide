from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import os
from dotenv import load_dotenv
from google import genai 
import imaplib
import email as email_parser
from datetime import datetime, timedelta
from typing import Optional

# Load environment variables
load_dotenv()

router = APIRouter()

# Initialize Gemini GenAI client
GENAI_API_KEY = os.getenv("GENAI_API_KEY")
if not GENAI_API_KEY:
    raise HTTPException(status_code=500, detail="GENAI_API_KEY not set in environment variables.")
client = genai.Client(api_key=GENAI_API_KEY)

class EmailRequest(BaseModel):
    # For testing, 'days' is interpreted as minutes. Default to 2 minutes.
    days: int = 2

# Hardcoded email addresses
SENDER_EMAIL = "sanchittmaheshwari@gmail.com"
RECEIVER_EMAIL_1 = "mannsinghbrar77@gmail.com"
RECEIVER_EMAIL_2 = "smaheshwari@wattmonk.com"

async def generate_llm_content(prompt: str, model_name: str = "gemini-2.0-flash") -> str:
    response = client.models.generate_content(
        model=model_name,
        contents=prompt
    )
    return response.text

async def send_email_async(to_email: str, subject: str, body: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_username = os.getenv("SMTP_USERNAME", SENDER_EMAIL)
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_password:
        print("SMTP_PASSWORD not set in environment variables. Email will not be sent.")
        return

    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        print(f"Email sent successfully to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")

async def read_latest_email(from_email: str, since_datetime: datetime) -> Optional[str]:
    imap_server = os.getenv("IMAP_SERVER", "imap.gmail.com")
    imap_port = int(os.getenv("IMAP_PORT", 993))
    imap_username = os.getenv("IMAP_USERNAME", SENDER_EMAIL)
    imap_password = os.getenv("IMAP_PASSWORD")

    if not imap_password:
        print("IMAP_PASSWORD not set in environment variables. Cannot read emails.")
        return None

    try:
        mail = imaplib.IMAP4_SSL(imap_server, imap_port)
        mail.login(imap_username, imap_password)
        mail.select('inbox')

        # Search for emails from the specific sender, received after a certain date
        date_str = since_datetime.strftime("%d-%b-%Y")
        search_criteria = f'(FROM "{from_email}" SINCE "{date_str}")'
        print(f"Searching inbox with criteria: {search_criteria}")
        status, email_ids = mail.search(None, 'FROM', from_email, 'SINCE', date_str)
        
        email_id_list = email_ids[0].split()
        print(f"Found email IDs: {email_id_list}")
        if not email_id_list:
            print(f"No emails found from {from_email} since {date_str}.")
            mail.logout()
            return None

        # Get the latest email
        latest_email_id = email_id_list[-1]
        status, msg_data = mail.fetch(latest_email_id, '(RFC822)')
        
        msg = email_parser.message_from_bytes(msg_data[0][1])
        
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                cdispo = str(part.get('Content-Disposition'))

                # Look for plain text parts, not attachments
                if ctype == 'text/plain' and 'attachment' not in cdispo:
                    body = part.get_payload(decode=True).decode()
                    break
        else:
            body = msg.get_payload(decode=True).decode()
        
        mail.logout()
        print(f"Extracted email body: {body[:200]}...") # Print first 200 chars of body
        return body
    except Exception as e:
        print(f"Failed to read email from inbox: {e}")
        return None

async def email_workflow(days: int):
    # For testing, interpret 'days' as minutes for the initial delay.
    # In a production environment, this would be 'days * 24 * 60 * 60'.
    # For now, it's 'days * 60' for minutes.
    await asyncio.sleep(days * 60) # Simulate delay in minutes

    # Record the time before sending the first email to filter replies
    send_time = datetime.now()

    # Step 1: Send initial email to mannsinghbrar77@gmail.com
    initial_email_prompt = "Generate an email asking for an update regarding the submitted documents track of the documents."
    initial_email_body = await generate_llm_content(initial_email_prompt)
    await send_email_async(RECEIVER_EMAIL_1, "Update on Submitted Documents", initial_email_body)

    # Wait for a reply (e.g., 1 minute for testing, or longer in a real scenario)
    print(f"Waiting for reply from {RECEIVER_EMAIL_1} to {SENDER_EMAIL}...")
    await asyncio.sleep(180) # Wait for 3 minutes for a reply (3 * 60 seconds)

    # Step 2: Read the reply from mannsinghbrar77@gmail.com to sanchittmaheshwari@gmail.com
    # Removed subject_contains as it might not be predictable.
    reply_content = await read_latest_email(RECEIVER_EMAIL_1, send_time)
    
    if not reply_content:
        print(f"No reply found from {RECEIVER_EMAIL_1}. Cannot proceed with framing and sending to {RECEIVER_EMAIL_2}.")
        return # Stop the workflow if no reply is found
    else:
        print(f"Reply received from {RECEIVER_EMAIL_1}:\n{reply_content}")

    # Step 3: Frame the reply in user tone and send to tanishabisht1079@gmail.com
    framed_reply_prompt = f"The following is a reply regarding document status: '{reply_content}'. Frame this information in a user-friendly and encouraging tone for Tanisha Bisht, as an update from Sanchit Maheshwari."
    framed_reply_body = await generate_llm_content(framed_reply_prompt)
    await send_email_async(RECEIVER_EMAIL_2, f"Your Document Status Update", framed_reply_body)


@router.post("/email_service")
async def email_service_endpoint(request: EmailRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(email_workflow, request.days)
    return {"message": f"Email service initiated. Email will be processed after {request.days} days."}
