"""
Image processing utilities for extracting text from utility bill images
"""
import base64
import io
from typing import Optional, Dict, Any
from PIL import Image, ImageEnhance, ImageFilter
import google.generativeai as genai
import dotenv

# Configure Gemini
GENAI_API_KEY = dotenv.get_key(".env", "GENAI_API_KEY")
genai.configure(api_key=GENAI_API_KEY)

def enhance_image_quality(image: Image.Image) -> Image.Image:
    """
    Enhance image quality for better text recognition

    Args:
        image: PIL Image object

    Returns:
        Enhanced PIL Image object
    """
    try:
        # Apply sharpening filter for better text clarity
        image = image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))

        # Enhance contrast for better text visibility
        contrast_enhancer = ImageEnhance.Contrast(image)
        image = contrast_enhancer.enhance(1.2)

        # Enhance sharpness
        sharpness_enhancer = ImageEnhance.Sharpness(image)
        image = sharpness_enhancer.enhance(1.3)

        # Slight brightness adjustment if the image is too dark
        brightness_enhancer = ImageEnhance.Brightness(image)
        image = brightness_enhancer.enhance(1.1)

        return image
    except Exception as e:
        print(f"Warning: Image enhancement failed: {e}")
        return image  # Return original image if enhancement fails

def process_image_file(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Process an image file and extract utility bill information using Gemini Vision
    
    Args:
        file_content: Raw bytes of the image file
        filename: Original filename for reference
        
    Returns:
        Dictionary containing extracted information
    """
    try:
        # Open and validate the image
        image = Image.open(io.BytesIO(file_content))

        # Convert to RGB if necessary (for JPEG compatibility)
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')

        # Enhance image quality for better OCR/analysis
        image = enhance_image_quality(image)

        # Resize image if too large (Gemini has size limits)
        max_size = (2048, 2048)
        if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
            image.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Ensure minimum size for better analysis
        min_size = (800, 600)
        if image.size[0] < min_size[0] or image.size[1] < min_size[1]:
            # Upscale small images
            scale_factor = max(min_size[0] / image.size[0], min_size[1] / image.size[1])
            new_size = (int(image.size[0] * scale_factor), int(image.size[1] * scale_factor))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        # Convert to base64 for Gemini API with high quality
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG', quality=95, optimize=True)
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        # Extract text and information using Gemini Vision with retry mechanism
        extracted_info = extract_utility_info_from_image(img_base64)

        # If address extraction failed, try a more focused approach
        if extracted_info.get("customer_address", "").lower() in ["n/a", "", "not found"]:
            print("🔄 First address extraction failed, trying focused approach...")
            focused_info = extract_address_focused(img_base64)
            if focused_info.get("customer_address", "").lower() not in ["n/a", "", "not found"]:
                extracted_info["customer_address"] = focused_info["customer_address"]
                print(f"✅ Focused extraction found address: {focused_info['customer_address']}")

        return {
            "success": True,
            "extracted_text": extracted_info.get("raw_text", ""),
            "structured_data": extracted_info.get("structured_data", {}),
            "customer_address": extracted_info.get("customer_address", ""),
            "billing_period": extracted_info.get("billing_period", ""),
            "energy_consumption": extracted_info.get("energy_consumption", ""),
            "account_number": extracted_info.get("account_number", ""),
            "utility_company": extracted_info.get("utility_company", ""),
            "image_dimensions": image.size,
            "processed_filename": filename
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to process image: {str(e)}",
            "extracted_text": "",
            "structured_data": {},
            "customer_address": "",
            "billing_period": "",
            "energy_consumption": "",
            "account_number": "",
            "utility_company": "",
            "processed_filename": filename
        }

def extract_utility_info_from_image(image_base64: str) -> Dict[str, Any]:
    """
    Use Gemini Vision to extract structured information from utility bill image
    
    Args:
        image_base64: Base64 encoded image
        
    Returns:
        Dictionary with extracted information
    """
    try:
        # Initialize Gemini model with vision capabilities
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Create the prompt for utility bill analysis with enhanced address extraction
        prompt = """
        You are an expert at reading utility bills. Analyze this utility bill image very carefully and extract the following information in JSON format.

        CRITICAL: Pay special attention to finding the CUSTOMER SERVICE ADDRESS or BILLING ADDRESS. This is usually:
        - Listed as "Service Address", "Billing Address", "Customer Address", or "Property Address"
        - Located in the top section of the bill
        - Contains street number, street name, city, state, and ZIP code
        - May be different from the utility company's address

        Extract this information in JSON format:
        {
            "customer_address": "FULL customer service/billing address with street, city, state, ZIP",
            "service_address": "Service address if different from billing address",
            "billing_period": "Billing period dates",
            "energy_consumption": "Total energy consumption with units (kWh, therms, etc.)",
            "account_number": "Account or customer number",
            "utility_company": "Name of the utility company",
            "bill_amount": "Total amount due with currency",
            "meter_reading": "Current and previous meter readings if available",
            "rate_schedule": "Rate schedule or tariff information",
            "raw_text": "All visible text from the image"
        }

        IMPORTANT INSTRUCTIONS:
        1. FOCUS ON FINDING THE CUSTOMER/SERVICE ADDRESS - this is the most critical field
        2. Look for address patterns: [Number] [Street Name] [Street Type], [City], [State] [ZIP]
        3. Ignore the utility company's corporate address - find the CUSTOMER's address
        4. If you see multiple addresses, choose the one labeled as service/billing/customer address
        5. Extract exact text as it appears - don't modify or interpret
        6. If any field is not clearly visible, use "N/A"
        7. For addresses, include the complete address with all components
        8. Double-check that the address you extract is the CUSTOMER's address, not the utility company's

        Return only valid JSON format with no additional text or formatting.
        """
        
        # Prepare the image for Gemini
        image_part = {
            "mime_type": "image/jpeg",
            "data": image_base64
        }
        
        # Generate response
        response = model.generate_content([prompt, image_part])
        
        # Parse the JSON response
        import json
        try:
            # Clean the response text (remove markdown formatting if present)
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            extracted_data = json.loads(response_text.strip())
            
            return {
                "structured_data": extracted_data,
                "raw_text": extracted_data.get("raw_text", ""),
                "customer_address": extracted_data.get("customer_address", "N/A"),
                "billing_period": extracted_data.get("billing_period", "N/A"),
                "energy_consumption": extracted_data.get("energy_consumption", "N/A"),
                "account_number": extracted_data.get("account_number", "N/A"),
                "utility_company": extracted_data.get("utility_company", "N/A")
            }
            
        except json.JSONDecodeError:
            # Fallback: return raw text if JSON parsing fails
            return {
                "structured_data": {},
                "raw_text": response.text,
                "customer_address": "N/A",
                "billing_period": "N/A", 
                "energy_consumption": "N/A",
                "account_number": "N/A",
                "utility_company": "N/A"
            }
            
    except Exception as e:
        print(f"Error in Gemini Vision analysis: {str(e)}")
        return {
            "structured_data": {},
            "raw_text": f"Error processing image: {str(e)}",
            "customer_address": "N/A",
            "billing_period": "N/A",
            "energy_consumption": "N/A", 
            "account_number": "N/A",
            "utility_company": "N/A"
        }

def extract_address_focused(image_base64: str) -> Dict[str, Any]:
    """
    Focused address extraction using a simpler, more direct approach

    Args:
        image_base64: Base64 encoded image

    Returns:
        Dictionary with extracted address information
    """
    try:
        # Initialize Gemini model with vision capabilities
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Create a very focused prompt just for address extraction
        prompt = """
        Look at this utility bill image and find the CUSTOMER'S ADDRESS only.

        The customer address is usually labeled as:
        - "Service Address"
        - "Billing Address"
        - "Customer Address"
        - "Property Address"
        - "Service Location"

        IGNORE any addresses that are:
        - The utility company's corporate address
        - Payment addresses
        - Mailing addresses for the utility company

        Return ONLY the customer's complete address in this exact format:
        [Street Number] [Street Name], [City], [State] [ZIP Code]

        If you cannot find a clear customer address, respond with: "N/A"

        Do not include any other text, explanations, or formatting.
        """

        # Prepare the image for Gemini
        image_part = {
            "mime_type": "image/jpeg",
            "data": image_base64
        }

        # Generate response
        response = model.generate_content([prompt, image_part])

        # Clean and validate the response
        address = response.text.strip()

        # Basic validation - check if it looks like an address
        if address and address.lower() != "n/a" and len(address) > 10:
            # Check if it contains typical address components
            if any(char.isdigit() for char in address) and ',' in address:
                return {
                    "customer_address": address,
                    "extraction_method": "focused"
                }

        return {
            "customer_address": "N/A",
            "extraction_method": "focused_failed"
        }

    except Exception as e:
        print(f"Error in focused address extraction: {str(e)}")
        return {
            "customer_address": "N/A",
            "extraction_method": "focused_error"
        }

def is_image_file(filename: str) -> bool:
    """
    Check if a file is an image based on its extension
    
    Args:
        filename: Name of the file
        
    Returns:
        True if the file is an image, False otherwise
    """
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.gif'}
    return any(filename.lower().endswith(ext) for ext in image_extensions)

def validate_image_file(file_content: bytes, max_size_mb: int = 10) -> Dict[str, Any]:
    """
    Validate an image file for processing
    
    Args:
        file_content: Raw bytes of the image file
        max_size_mb: Maximum allowed file size in MB
        
    Returns:
        Dictionary with validation results
    """
    try:
        # Check file size
        file_size_mb = len(file_content) / (1024 * 1024)
        if file_size_mb > max_size_mb:
            return {
                "valid": False,
                "error": f"File size ({file_size_mb:.1f}MB) exceeds maximum allowed size ({max_size_mb}MB)"
            }
        
        # Try to open the image
        image = Image.open(io.BytesIO(file_content))
        
        # Check image dimensions (reasonable limits)
        width, height = image.size
        if width < 100 or height < 100:
            return {
                "valid": False,
                "error": "Image dimensions too small (minimum 100x100 pixels)"
            }
        
        if width > 10000 or height > 10000:
            return {
                "valid": False,
                "error": "Image dimensions too large (maximum 10000x10000 pixels)"
            }
        
        return {
            "valid": True,
            "width": width,
            "height": height,
            "format": image.format,
            "mode": image.mode,
            "size_mb": file_size_mb
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": f"Invalid image file: {str(e)}"
        }
