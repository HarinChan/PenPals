import openvino_genai as ov_genai

model_path = "qwen3-1.7b-int4-ov"

device = "CPU"
pipe = ov_genai.LLMPipeline(model_path, "CPU")
streamer = lambda x: print(x, end='', flush=True)


config = pipe.get_generation_config()
config.max_new_tokens = 10


i = "snens"

print(pipe.generate(i, config, streamer=streamer))


