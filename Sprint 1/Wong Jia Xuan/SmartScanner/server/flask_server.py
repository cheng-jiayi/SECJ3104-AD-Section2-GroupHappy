from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import os
import logging
import random
import numpy as np
import json
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global variables for model
interpreter = None
CLASS_NAMES = ['Plastic', 'Glass', 'Metal', 'Paper', 'Non-Recyclable', 'Tyre']

# Create directories for saving data
os.makedirs('training_images', exist_ok=True)
os.makedirs('recycling_data', exist_ok=True)

def load_model():
    """Load the TFLite model - use tflite_runtime or fallback to mock"""
    global interpreter
    try:
        model_path = "recyclable_items_model.tflite"
        if not os.path.exists(model_path):
            logger.warning(f"Model file not found: {model_path}. Using mock mode.")
            return False
        
        logger.info("Attempting to load TFLite model...")
        
        # Try tflite_runtime first (most reliable for TFLite)
        try:
            from tflite_runtime.interpreter import Interpreter
            interpreter = Interpreter(model_path=model_path)
            interpreter.allocate_tensors()
            logger.info("✅ Model loaded successfully with tflite_runtime!")
            return True
        except ImportError:
            logger.info("tflite_runtime not available, trying TensorFlow...")
        
        # Try TensorFlow as fallback
        try:
            import tensorflow as tf
            logger.info(f"✅ TensorFlow version: {tf.__version__}")
            interpreter = tf.lite.Interpreter(model_path=model_path)
            interpreter.allocate_tensors()
            logger.info("✅ Model loaded successfully with TensorFlow!")
            return True
        except Exception as tf_error:
            logger.error(f"TensorFlow failed: {tf_error}")
            return False
            
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        return False

@app.route('/save_recycling_data', methods=['POST'])
def save_recycling_data():
    """Save recycling data to laptop"""
    try:
        data = request.get_json()
        logger.info(f"Received recycling data: {data}")
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"recycling_data/recycling_{timestamp}.json"
        
        # Save to JSON file
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"✅ Recycling data saved to: {filename}")
        
        return jsonify({
            'success': True,
            'message': f'Recycling data saved successfully',
            'filename': filename
        })
        
    except Exception as e:
        logger.error(f"Error saving recycling data: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to save recycling data: {str(e)}'
        }), 500

@app.route('/save_training_image', methods=['POST'])
def save_training_image():
    """Save image for AI training/improvement"""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file provided'}), 400
            
        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Get additional data
        detected_classes = request.form.get('detected_classes', '[]')
        timestamp = request.form.get('timestamp', datetime.now().isoformat())
        
        # Generate filename
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"training_images/training_{timestamp_str}.jpg"
        
        # Save the image
        image = Image.open(file.stream).convert('RGB')
        image.save(filename, 'JPEG')
        
        # Save metadata
        metadata = {
            'filename': filename,
            'detected_classes': json.loads(detected_classes),
            'timestamp': timestamp,
            'original_filename': file.filename
        }
        
        metadata_filename = f"training_images/training_{timestamp_str}_metadata.json"
        with open(metadata_filename, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"✅ Training image saved: {filename}")
        logger.info(f"✅ Metadata saved: {metadata_filename}")
        logger.info(f"Detected classes: {detected_classes}")
        
        return jsonify({
            'success': True,
            'message': 'Training image saved successfully',
            'image_path': filename,
            'metadata_path': metadata_filename
        })
        
    except Exception as e:
        logger.error(f"Error saving training image: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to save training image: {str(e)}'
        }), 500

# Your existing routes remain the same...
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': interpreter is not None,
        'message': 'Recyclable Items Detection API is running',
        'server_name': 'Recyclable Items Detection Server',
        'mode': 'real_model' if interpreter is not None else 'mock_detection'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint for recyclable items detection"""
    try:
        logger.info("Received recyclable items detection request")
        
        # Check if image was provided
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
            
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Read and process image
        image = Image.open(file.stream).convert('RGB')
        logger.info(f"Processing image size: {image.size}")
        
        # Use real model if loaded, otherwise use mock
        if interpreter is not None:
            detections = run_real_detection(image)
        else:
            detections = get_mock_detections()
            logger.info("Using mock detections (model not loaded)")
        
        logger.info(f"Found {len(detections)} recyclable items")
        
        return jsonify({
            'success': True,
            'detections': detections,
            'server': 'Recyclable Items Detection Server',
            'model_used': 'real' if interpreter is not None else 'mock',
            'image_info': {
                'original_size': image.size
            }
        })
        
    except Exception as e:
        logger.error(f"Recyclable items detection error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Recyclable items detection failed: {str(e)}'
        }), 500

def run_real_detection(image):
    """Run real TFLite model detection"""
    try:
        # Get model input details
        input_details = interpreter.get_input_details()
        input_shape = input_details[0]['shape']
        
        # Resize image to model input size
        target_size = (input_shape[1], input_shape[2])  # (height, width)
        image_resized = image.resize(target_size, Image.Resampling.LANCZOS)
        
        # Normalize and prepare input
        input_data = np.expand_dims(np.array(image_resized) / 255.0, axis=0).astype(np.float32)
        
        logger.info(f"Input data shape: {input_data.shape}")
        
        # Run inference
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        
        # Get output
        output_details = interpreter.get_output_details()
        detections = []
        
        # Process classification output
        for i, output_detail in enumerate(output_details):
            output_data = interpreter.get_tensor(output_detail['index'])
            
            # Simple classification output
            if output_data.ndim == 2 and output_data.shape[1] == len(CLASS_NAMES):
                for class_id, confidence in enumerate(output_data[0]):
                    if confidence > 0.3:  # Confidence threshold
                        detections.append({
                            'class': CLASS_NAMES[class_id],
                            'confidence': float(confidence),
                            'class_id': class_id,
                            'recyclable': CLASS_NAMES[class_id] != 'Non-Recyclable'
                        })
        
        return detections if detections else get_mock_detections()
        
    except Exception as e:
        logger.error(f"Real detection error: {e}")
        return get_mock_detections()

def get_mock_detections():
    """Provide mock detections for demo"""
    detections = []
    
    # Randomly select 1-2 recyclable classes
    recyclable_classes = ['Plastic', 'Glass', 'Metal', 'Paper']
    num_detections = random.randint(1, 2)
    selected_classes = random.sample(recyclable_classes, num_detections)
    
    for class_name in selected_classes:
        detections.append({
            'class': class_name,
            'confidence': round(random.uniform(0.7, 0.95), 2),
            'class_id': CLASS_NAMES.index(class_name),
            'recyclable': True,
            'note': 'Mock detection for demonstration'
        })
    
    return detections

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get model information"""
    if interpreter is None:
        return jsonify({
            'model_loaded': False,
            'message': 'Using mock detection mode',
            'classes': CLASS_NAMES,
            'recyclable_classes': ['Plastic', 'Glass', 'Metal', 'Paper']
        })
    
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    return jsonify({
        'model_loaded': True,
        'input_shape': input_details[0]['shape'].tolist(),
        'output_count': len(output_details),
        'classes': CLASS_NAMES
    })

# Load model when server starts
model_loaded = load_model()

if __name__ == '__main__':
    print("🚀 Recyclable Items Detection Server Starting...")
    print("================================================")
    
    if model_loaded:
        print("✅ Model loaded successfully!")
    else:
        print("🟡 Using mock detection mode")
        print("💡 To use real model:")
        print("   1. Ensure 'recyclable_items_model.tflite' is in this directory")
    
    print("\n🔗 Server running on: http://localhost:5000")
    print("📱 Ready to receive requests!")
    print("\nNew Endpoints Added:")
    print("  POST /save_recycling_data - Save recycling data to laptop")
    print("  POST /save_training_image - Save images for AI improvement")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
