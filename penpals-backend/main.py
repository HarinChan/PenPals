from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/data', methods=['GET'])
def get_data():
    sample_data = {"message": "Hello from Flask!"}
    return jsonify(sample_data)

@app.route('/api/data', methods=['POST'])
def post_data():
    data = request.json
    return jsonify({"received_data": data}), 201

if __name__ == '__main__':
    app.run(debug=True)