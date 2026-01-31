import json
import uuid

'''
id adder
'''
def add_unique_ids_to_json(input_filepath, output_filepath='output_with_ids.json', id_key='id'):
    """
    Reads a JSON file containing an array of objects, adds a unique ID (UUID)
    to each object, and writes the result to a new file.

    Args:
        input_filepath (str): The path to the input JSON file.
        output_filepath (str): The path where the output JSON will be saved.
        id_key (str): The name of the property to use for the unique ID.
    """
    try:
        # 1. Read the input JSON file
        with open(input_filepath, 'r') as f:
            data_array = json.load(f)

        # Ensure the loaded data is a list (an array of objects)
        if not isinstance(data_array, list):
            print(f"⚠️ Error: The JSON file content is not a list (array).")
            return

        # 2. Iterate and add a unique ID to each object
        print(f"✨ Adding '{id_key}' property with a unique UUID to {len(data_array)} objects...")
        
        count = 1
        for item in data_array:
            # Generate a new unique ID (UUID4 is standard)
            unique_id = str(uuid.uuid4())
            # Add the unique ID to the current object
            item[id_key] = unique_id
            item['no'] = count
            item['question-no'] = count
            count = count + 1

        # 3. Write the modified data to the output JSON file
        with open(output_filepath, 'w') as f:
            # Use indent for clean, readable output
            json.dump(data_array, f, indent=4)

        print(f"✅ Success! Data saved to '{output_filepath}'")
        
    except FileNotFoundError:
        print(f"❌ Error: Input file not found at '{input_filepath}'")
    except json.JSONDecodeError:
        print(f"❌ Error: Could not decode JSON from '{input_filepath}'. Check file format.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# --- Configuration and Execution ---

# 📌 IMPORTANT: Replace 'input_data.json' with the actual path to your file.
INPUT_FILE = 'revise6.json'
OUTPUT_FILE = 'revise6.json'
ID_PROPERTY_NAME = 'id' # You can change this property name

add_unique_ids_to_json(INPUT_FILE, OUTPUT_FILE, ID_PROPERTY_NAME)
