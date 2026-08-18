from pathlib import Path
from uuid import uuid4

import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from skin_predictor import analyze_skin_disease


ROOT_DIR = Path(__file__).resolve().parents[2]

RUNTIME_DIR = ROOT_DIR / "backend" / "runtime"
UPLOAD_DIR = RUNTIME_DIR / "uploads"
HEATMAP_DIR = RUNTIME_DIR / "heatmaps"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
HEATMAP_DIR.mkdir(parents=True, exist_ok=True)


app = Flask(__name__)


CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    }
)


DISEASE_EXPLANATIONS = {
    "Actinic Keratoses": {
        "about": "A rough, scaly lesion often linked with cumulative sun exposure. It can be precancerous, so clinical review is important.",
        "signals": [
            "Rough or crusted texture",
            "Sun-exposed skin pattern",
            "Pink, red, or brown color variation",
        ],
    },

    "Basal Cell Carcinoma": {
        "about": "A common skin cancer that may appear pearly, shiny, ulcerated, or slowly enlarging.",
        "signals": [
            "Rolled or raised border",
            "Pearly or translucent areas",
            "Local contrast around the lesion edge",
        ],
    },

    "Benign Keratosis": {
        "about": "A non-cancerous growth category that can look waxy, stuck-on, or scaly.",
        "signals": [
            "Well-defined lesion border",
            "Waxy or keratin-like texture",
            "Brown or tan pigmentation pattern",
        ],
    },

    "Dermatofibroma": {
        "about": "A usually benign firm skin nodule that can appear brown, pink, or scar-like.",
        "signals": [
            "Compact rounded region",
            "Central color or texture change",
            "Border contrast with surrounding skin",
        ],
    },

    "Melanoma": {
        "about": "A serious skin cancer associated with irregular pigment, border, shape, or color changes.",
        "signals": [
            "Asymmetric color distribution",
            "Irregular lesion edges",
            "Dark or multi-toned pigment regions",
        ],
    },

    "Melanocytic Nevus": {
        "about": "A mole-like melanocytic lesion that is often benign, though changes should be checked.",
        "signals": [
            "Pigmented lesion body",
            "Relatively organized shape",
            "Color concentration within the mole",
        ],
    },

    "Vascular Lesions": {
        "about": "A group of blood-vessel-related lesions, often with red, purple, or blue coloration.",
        "signals": [
            "Red or purple vascular color",
            "Clustered color intensity",
            "Smooth lesion boundaries",
        ],
    },
}


def build_xai_explanation(result):
    disease = result["predicted_disease"]
    confidence = result["confidence"] * 100

    explanation = DISEASE_EXPLANATIONS.get(
        disease,
        {}
    )

    if confidence >= 80:
        confidence_note = (
            "The model is strongly weighted toward this "
            "class compared with the alternatives."
        )

    elif confidence >= 55:
        confidence_note = (
            "The model found this class most likely, "
            "but nearby alternatives should be reviewed."
        )

    else:
        confidence_note = (
            "The model confidence is low, so treat this "
            "as a weak screening signal."
        )

    return {
        "about": explanation.get(
            "about",
            "The model matched visual patterns learned "
            "from the HAM10000 classes.",
        ),

        "signals": explanation.get(
            "signals",
            [
                "Lesion color",
                "Texture",
                "Border and shape pattern",
            ],
        ),

        "confidence_note": confidence_note,

        "gradcam_note": (
            "Grad-CAM is temporarily disabled while "
            "AI inference performance is being tested."
        ),
    }


def download_image(
    image_url,
    original_name="skin-image.jpg"
):
    suffix = (
        Path(
            secure_filename(
                original_name
            )
        ).suffix.lower()
        or ".jpg"
    )

    image_path = (
        UPLOAD_DIR
        / f"{uuid4().hex}{suffix}"
    )

    response = requests.get(
        image_url,
        timeout=30
    )

    response.raise_for_status()

    image_path.write_bytes(
        response.content
    )

    return image_path


@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "model": "Skin Disease Predictor",
    })


@app.get("/api/ai/heatmaps/<path:filename>")
def heatmap(filename):
    return send_from_directory(
        HEATMAP_DIR,
        filename
    )


@app.post("/api/ai/predict")
def predict():

    print("AI API: /api/ai/predict request received")

    payload = (
        request.get_json(
            silent=True
        )
        or {}
    )

    submission_type = payload.get(
        "submission_type"
    )


    if submission_type != "skin_image":

        return jsonify({
            "model": "Clinical CDS placeholder",

            "model_type":
                submission_type or "unknown",

            "prediction":
                "Model not connected for this submission type",

            "predicted_disease":
                "Model not connected for this submission type",

            "confidence": 0,

            "summary":
                "Only the skin disease model is currently "
                "integrated with explainability.",
        })


    image_url = payload.get(
        "image_url"
    )


    if not image_url:

        return jsonify({
            "error":
                "Missing image_url for skin image prediction."
        }), 400


    print("AI API: Downloading image...")

    image_path = download_image(
        image_url,
        payload.get(
            "file_name"
        ) or "skin-image.jpg"
    )

    print(
        f"AI API: Image downloaded to {image_path}"
    )


    print(
        "AI API: Starting skin disease prediction..."
    )


    result = analyze_skin_disease(
        image_path
    )


    print(
        "AI API: Skin disease prediction completed."
    )


    # -----------------------------------------------------
    # GRAD-CAM TEMPORARILY DISABLED
    #
    # This is intentional for diagnosis.
    # We first want to determine whether the TensorFlow
    # model prediction itself works within Render's limits.
    # -----------------------------------------------------

    print(
        "AI API: Grad-CAM temporarily disabled."
    )


    return jsonify({

        **result,

        "model":
            "Skin Disease Predictor",

        "model_type":
            "skin_disease",

        "xai":
            build_xai_explanation(
                result
            ),

        "heatmap_url":
            None,

        "summary":
            (
                f"Predicted "
                f"{result['predicted_disease']} "
                f"with "
                f"{result['confidence'] * 100:.1f}% "
                f"confidence."
            ),
    })


if __name__ == "__main__":

    import os

    app.run(
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                8000
            )
        ),
        debug=False,
    )