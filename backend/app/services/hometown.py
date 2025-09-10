import requests

def get_jurisdiction(address: str):
    # Step 1: Get coordinates
    resp = requests.get("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
                        params={
                            "address": address,
                            "benchmark": "Public_AR_Current",
                            "format": "json"
                        })
    matches = resp.json()['result']['addressMatches']
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
    geo = geo_resp.json()['result']['geographies']

    county = geo['Counties'][0]['NAME'] if 'Counties' in geo else None
    township = geo['County Subdivisions'][0]['NAME'] if 'County Subdivisions' in geo else None
    place = geo['Places'][0]['NAME'] if 'Places' in geo and geo['Places'] else None

    return {
        "county": county,
        "township": township,
        "place": place
    }