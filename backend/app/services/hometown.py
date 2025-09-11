import requests

def get_jurisdiction(address: str):
    try:
        # Step 1: Get coordinates
        resp = requests.get("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
                            params={
                                "address": address,
                                "benchmark": "Public_AR_Current",
                                "format": "json"
                            })

        response_data = resp.json()

        # Check if the response has the expected structure
        if 'result' not in response_data:
            print(f"Unexpected response structure: {response_data}")
            return None

        if 'addressMatches' not in response_data['result']:
            print(f"No addressMatches in response: {response_data}")
            return None

        matches = response_data['result']['addressMatches']
        if not matches:
            return None  # address not found

        coords = matches[0]['coordinates']
        lon, lat = coords['x'], coords['y']

        # Step 2: Get geographies
        geo_resp = requests.get("https://geocoding.geo.census.gov/geocoder/geographies/coordinates",
                                params={
                                    "x": lon,
                                    "y": lat,
                                    "benchmark": "Public_AR_Current",
                                    "vintage": "Current_Current",
                                    "format": "json"
                                })

        geo_data = geo_resp.json()

        # Check if the geography response has the expected structure
        if 'result' not in geo_data or 'geographies' not in geo_data['result']:
            print(f"Unexpected geography response structure: {geo_data}")
            return None

        geo = geo_data['result']['geographies']

        county = geo['Counties'][0]['NAME'] if 'Counties' in geo and geo['Counties'] else None
        township = geo['County Subdivisions'][0]['NAME'] if 'County Subdivisions' in geo and geo['County Subdivisions'] else None
        place = geo['Places'][0]['NAME'] if 'Places' in geo and geo['Places'] else None

        return {
            "county": county,
            "township": township,
            "place": place
        }

    except Exception as e:
        print(f"Error in get_jurisdiction: {e}")
        return None