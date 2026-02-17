import huggingface_hub as hf_hub

model_id = "OpenVINO/qwen3-1.7b-int4-ov"
model_path = "qwen3-1.7b-int4-ov"

hf_hub.snapshot_download(model_id, local_dir=model_path)
