# /backend/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS

# Import necessary modules
from portfolio_allocator import allocate_portfolio

app = Flask(__name__)
CORS(app)

# Existing global variables and routes
items = []
next_id = 1
portfolio_value = None

@app.route('/items', methods=['GET', 'POST'])
def handle_items():
    global next_id
    if request.method == 'POST':
        ticker = request.json.get('ticker')
        if not ticker:
            return jsonify({'error': 'Ticker is required'}), 400
        # Ensure ticker is uppercase and 1-5 letters
        if not ticker.isupper() or not (1 <= len(ticker) <= 5):
            return jsonify({'error': 'Invalid ticker format'}), 400
        item = {'id': next_id, 'ticker': ticker}
        items.append(item)
        next_id += 1
        return jsonify(item), 201
    return jsonify(items)

@app.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    global items
    item = next((item for item in items if item['id'] == item_id), None)
    if item is None:
        return jsonify({'error': 'Item not found'}), 404
    items = [item for item in items if item['id'] != item_id]
    return jsonify({'message': 'Item deleted'}), 200

@app.route('/portfolio', methods=['GET', 'POST'])
def handle_portfolio():
    global portfolio_value
    if request.method == 'POST':
        value = request.json.get('value')
        if value is None:
            return jsonify({'error': 'Portfolio value is required'}), 400
        try:
            value = float(value)
            if value <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({'error': 'Portfolio value must be a positive number'}), 400
        portfolio_value = value
        return jsonify({'message': 'Portfolio value set'}), 200
    return jsonify({'portfolio_value': portfolio_value})

@app.route('/calculate_portfolio', methods=['POST'])
def calculate_portfolio():
    """
    Endpoint to calculate the portfolio allocation.
    Expects JSON input with 'budget' (float) and 'stocks' (list of tickers).
    Returns the allocation results as JSON.
    """
    data = request.get_json()
    budget = data.get('budget')
    stocks = data.get('stocks')

    if budget is None or stocks is None:
        return jsonify({'error': 'Budget and stocks are required'}), 400

    # Validate budget
    try:
        budget = float(budget)
        if budget <= 0:
            raise ValueError
    except ValueError:
        return jsonify({'error': 'Budget must be a positive number'}), 400

    # Validate stocks
    if not isinstance(stocks, list) or not all(isinstance(ticker, str) for ticker in stocks):
        return jsonify({'error': 'Stocks must be a list of ticker strings'}), 400

    try:
        allocation_results = allocate_portfolio(stocks, budget)
        return jsonify(allocation_results), 200
    except Exception as e:
        # Return the error message for debugging (optional)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)