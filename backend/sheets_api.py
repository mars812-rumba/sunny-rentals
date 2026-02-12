
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime, timedelta

# --- CONFIGURATION ---
# TODO: Move these to a proper config file or environment variables
SPREADSHEET_ID = "1HNI2qGBU36VMlivp9yQNH2Iy3yH3_ME6za3dRu2oxAs"
CREDENTIALS_FILE = "creds.json"
# The name of the worksheet within your Google Sheet that holds the bookings.
BOOKINGS_WORKSHEET_NAME = "Bookings" 

# --- CORE FUNCTIONS ---

def connect_to_sheets():
    """Connects to Google Sheets and returns the bookings worksheet object."""
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        worksheet = spreadsheet.worksheet(BOOKINGS_WORKSHEET_NAME)
        return worksheet
    except gspread.exceptions.WorksheetNotFound:
        print(f"ERROR: Worksheet named '{BOOKINGS_WORKSHEET_NAME}' not found.")
        print("Please create it in your Google Sheet.")
        return None
    except Exception as e:
        print(f"ERROR: Could not connect to Google Sheets. {e}")
        return None

def find_date_row(all_values, scan_rows=5):
    """Finds the 0-based index of the row containing dates."""
    best_row = None
    best_count = 0
    for r in range(min(scan_rows, len(all_values))):
        row = all_values[r]
        # Count how many cells in the row look like a date
        cnt = sum(1 for v in row if _norm_date_str(v) is not None)
        if cnt > best_count:
            best_count = cnt
            best_row = r
    return best_row if best_count >= 3 else None

def build_date_index(date_row_vals):
    """Builds a map of { 'YYYY-MM-DD': column_index }."""
    idx = {}
    for i, v in enumerate(date_row_vals):
        normalized_date = _norm_date_str(v)
        if normalized_date:
            idx[normalized_date] = i
    return idx

def get_available_cars(start_date, end_date):
    """
    Gets a list of available car names for a given date range.
    The end_date is non-inclusive.
    """
    try:
        sheet = connect_to_sheets()
        if not sheet:
            return []

        all_values = sheet.get_all_values()
        if not all_values:
            print("Sheet is empty.")
            return []

        date_row_idx = find_date_row(all_values)
        if date_row_idx is None:
            print("ERROR: Could not find the date header row in the sheet.")
            return []

        date_index = build_date_index(all_values[date_row_idx])
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_incl_str = (end_date - timedelta(days=1)).strftime("%Y-%m-%d")

        if start_str not in date_index or end_incl_str not in date_index:
            print(f"ERROR: Date range {start_str} to {end_incl_str} not found in sheet headers.")
            return []

        start_col_idx = date_index[start_str]
        end_col_idx = date_index[end_incl_str]

        car_start_row_idx = date_row_idx + 1
        car_rows = all_values[car_start_row_idx:]

        available_cars = []
        for row in car_rows:
            if not row or not row[0]:
                continue
            car_name = row[0].strip()
            
            # Check if the row is long enough for the date range
            if len(row) <= end_col_idx:
                continue

            is_free = True
            for i in range(start_col_idx, end_col_idx + 1):
                if row[i].strip() != "":
                    is_free = False
                    break
            
            if is_free:
                available_cars.append(car_name)
        
        return available_cars

    except Exception as e:
        print(f"ERROR: An error occurred while getting available cars: {e}")
        return [] # Return empty list on error

def book_car(car_name, start_date, end_date):
    """Public function to mark a car as booked ('-')."""
    return _mark_dates_in_sheet(car_name, start_date, end_date, symbol="-")

def cancel_booking(car_name, start_date, end_date):
    """Public function to clear a car's booking."""
    return _mark_dates_in_sheet(car_name, start_date, end_date, symbol="")


# --- PRIVATE HELPERS ---

def _mark_dates_in_sheet(car_name, start_date, end_date, symbol="-"):
    """Internal function to write a symbol ('-' or '') to a range of cells."""
    try:
        sheet = connect_to_sheets()
        if not sheet:
            return False

        all_values = sheet.get_all_values()
        if not all_values:
            print("Sheet is empty.")
            return False

        date_row_idx = find_date_row(all_values)
        if date_row_idx is None:
            print("ERROR: Could not find the date header row.")
            return False

        date_index = build_date_index(all_values[date_row_idx])

        start_str = start_date.strftime("%Y-%m-%d")
        end_incl_str = (end_date - timedelta(days=1)).strftime("%Y-%m-%d")

        if start_str not in date_index or end_incl_str not in date_index:
            print(f"ERROR: Date range {start_str} to {end_incl_str} not found in sheet headers.")
            return False

        start_col_idx = date_index[start_str]
        end_col_idx = date_index[end_incl_str]

        car_start_row_idx = date_row_idx + 1
        car_rows = all_values[car_start_row_idx:]

        target_row_idx = -1
        for i, row in enumerate(car_rows):
            if row and row[0].strip() == car_name:
                target_row_idx = car_start_row_idx + i
                break
        
        if target_row_idx == -1:
            print(f"ERROR: Car '{car_name}' not found in the sheet.")
            return False

        # Check for existing bookings only if we are adding a new booking
        if symbol != "":
            range_to_check = all_values[target_row_idx][start_col_idx : end_col_idx + 1]
            if any(cell.strip() for cell in range_to_check):
                print(f"ERROR: Car '{car_name}' is already booked in the selected date range.")
                return False

        # Prepare batch update
        cell_range = gspread.utils.rowcol_to_a1(target_row_idx + 1, start_col_idx + 1) + ":" + gspread.utils.rowcol_to_a1(target_row_idx + 1, end_col_idx + 1)
        values = [[symbol] * (end_col_idx - start_col_idx + 1)]
        sheet.update(cell_range, values, value_input_option='USER_ENTERED')
        
        print(f"SUCCESS: Sheet updated for '{car_name}' from {start_str} to {end_incl_str} with symbol '{symbol}'.")
        return True

    except Exception as e:
        print(f"ERROR: An error occurred while marking dates: {e}")
        return False

def _norm_date_str(s):
    """Tries to parse a string and return 'YYYY-MM-DD' format."""
    if not isinstance(s, str):
        return None
    s = s.strip()
    for p in ["%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y"]:
        try:
            return datetime.strptime(s, p).strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            pass
    return None

