import gspread
from google.oauth2.service_account import Credentials
import pandas as pd
import io

def get_google_sheet_data(spreadsheet_id: str, worksheet_name: str, credentials_path: str) -> bytes:
    """
    Authenticates with Google Sheets using a service account and fetches data from a specified worksheet.
    Returns the data as bytes in CSV format.
    """
    try:
        # Define the scope for Google Sheets and Drive API
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets.readonly",
            "https://www.googleapis.com/auth/drive.readonly"
        ]

        # Load credentials from the service account file
        credentials = Credentials.from_service_account_file(credentials_path, scopes=scopes)

        # Authorize the client
        client = gspread.authorize(credentials)

        # Open the spreadsheet by ID
        spreadsheet = client.open_by_key(spreadsheet_id)

        # Get the specific worksheet
        worksheet = spreadsheet.worksheet(worksheet_name)

        # Get all values from the worksheet
        data = worksheet.get_all_values()

        # Convert to pandas DataFrame and then to CSV bytes
        df = pd.DataFrame(data)
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False, header=False) # Assuming no header in the raw sheet data for now
        return csv_buffer.getvalue().encode('utf-8')

    except FileNotFoundError as e:
        print(f"Credentials file not found: {e}")
        raise e
    except Exception as e:
        print(f"Error in get_google_sheet_data: {type(e).__name__}: {e}")
        raise e
