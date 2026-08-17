from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

from skin_class_names import class_names


ROOT_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT_DIR / "models" / "skin_disease" / "skin_disease_model.keras"

model = load_model(MODEL_PATH)


def preprocess_image(image_path):
    img = image.load_img(image_path, target_size=(224, 224))
    img = image.img_to_array(img)
    img = img / 255.0
    return np.expand_dims(img, axis=0)


def analyze_skin_disease(image_path):
    img = preprocess_image(image_path)
    prediction = model.predict(img, verbose=0)[0]
    class_index = int(np.argmax(prediction))
    confidence = float(prediction[class_index])

    top_indices = np.argsort(prediction)[::-1][:3]
    top_predictions = [
        {
            "label": class_names[int(index)],
            "confidence": round(float(prediction[int(index)]), 4),
        }
        for index in top_indices
    ]

    return {
        "class_index": class_index,
        "predicted_disease": class_names[class_index],
        "prediction": class_names[class_index],
        "confidence": round(confidence, 4),
        "top_predictions": top_predictions,
    }


def _build_gradcam_model():
    base_model = model.layers[0]
    last_conv_layer = base_model.get_layer("Conv_1")
    return tf.keras.Model(
        inputs=base_model.input,
        outputs=[last_conv_layer.output, base_model.output],
    )


base_grad_model = _build_gradcam_model()


def _classifier_prediction(base_output):
    x = base_output
    for layer in model.layers[1:]:
        x = layer(x, training=False)
    return x


def generate_gradcam(img_path, output_path, class_index=None):
    img = preprocess_image(img_path)

    with tf.GradientTape() as tape:
        conv_outputs, base_output = base_grad_model(img)
        predictions = _classifier_prediction(base_output)

        if class_index is None:
            class_index = tf.argmax(predictions[0])

        class_channel = predictions[:, class_index]

    grads = tape.gradient(class_channel, conv_outputs)

    if grads is None:
        raise ValueError("Could not compute gradients for the selected class.")

    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = tf.reduce_sum(conv_outputs * pooled_grads, axis=-1)
    heatmap = tf.maximum(heatmap, 0)

    max_value = tf.reduce_max(heatmap)
    heatmap = tf.zeros_like(heatmap) if max_value == 0 else heatmap / max_value
    heatmap = heatmap.numpy()

    original = cv2.imread(str(img_path))
    if original is None:
        raise ValueError(f"Could not read image at {img_path}")

    heatmap = cv2.resize(heatmap, (original.shape[1], original.shape[0]))
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

    output = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), output)

    return output_path
