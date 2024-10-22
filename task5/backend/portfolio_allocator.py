import pandas as pd
import numpy as np
import statsmodels.api as sm
import os
from pypfopt.efficient_frontier import EfficientFrontier
from pypfopt import risk_models
import yfinance as yf

def read_french_data(file_path):
    """
    Reads a local Fama-French data CSV file.

    Parameters:
    -----------
    file_path : str
        Path to the local Fama-French CSV data file.

    Returns:
    --------
    df : pandas DataFrame
        DataFrame containing the parsed data with 'Date' as index.
    """
    
    # Example of constructing an absolute path

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"The file '{file_path}' does not exist.")

    try:
        # Read the CSV file
        df = pd.read_csv(file_path)
    except Exception as e:
        raise ValueError(f"Error reading '{file_path}': {e}")

    # Strip whitespace from column names
    df.columns = df.columns.str.strip()

    # Rename 'dates' to 'Date' if necessary
    if 'dates' in df.columns:
        df.rename(columns={'dates': 'Date'}, inplace=True)
    elif 'Date' not in df.columns:
        raise ValueError(f"'Date' column not found in '{file_path}'. Available columns: {df.columns.tolist()}")

    # Verify the DataFrame is not empty
    if df.empty:
        raise ValueError(f"The file '{file_path}' contains no data.")

    # Convert 'Date' to datetime
    try:
        df['Date'] = pd.to_datetime(df['Date'], format='%Y%m%d')
    except Exception as e:
        raise ValueError(f"Error parsing 'Date' in '{file_path}': {e}")

    # Set 'Date' as the index
    df.set_index('Date', inplace=True)

    return df


def get_carhart_factors():
    """
    Fetches the Carhart four-factor data from local CSV files.

    Returns:
    --------
    factors : pandas DataFrame
        DataFrame containing the Carhart four factors and Risk-Free rate.
    """
    # Filenames for Fama-French 3 Factors Daily and Momentum Factor Daily
    
    dir_path = os.path.dirname(os.path.realpath(__file__))  # Gets the directory where the script is located
    ff3_file = 'F-F_Research_Data_Factors_daily.CSV'
    momentum_file = 'F-F_Momentum_Factor_daily.CSV'


    # Read and process Fama-French 3 Factors
    ff3_df = read_french_data(ff3_file)

    # Read and process Momentum Factor
    momentum_df = read_french_data(momentum_file)

    # Rename 'Mom' to 'UMD' for consistency with the Carhart model
    momentum_df.columns = momentum_df.columns.str.strip()  # Strip any whitespace
    if 'Mom' in momentum_df.columns:
        momentum_df.rename(columns={'Mom': 'UMD'}, inplace=True)
    elif 'Mom   ' in momentum_df.columns:
        momentum_df.rename(columns={'Mom   ': 'UMD'}, inplace=True)
    else:
        raise ValueError(f"'Mom' column not found in '{momentum_file}'. Available columns: {momentum_df.columns.tolist()}")

    # Merge the two DataFrames on Date
    factors = ff3_df.join(momentum_df[['UMD']], how='inner')

    # Convert percentages to decimals
    try:
        factors = factors.astype(float) / 100
    except Exception as e:
        raise ValueError(f"Error converting factor data to float: {e}")

    # Verify the merged DataFrame is not empty
    if factors.empty:
        raise ValueError("The merged factors DataFrame is empty. Check if the data files have overlapping dates.")

    return factors


def carhart_expected_returns(price_data, frequency=252):
    """
    Calculate expected returns using the Carhart four-factor model.

    Parameters:
    -----------
    price_data : pandas DataFrame
        A DataFrame of stock prices, with dates as index and stock tickers as columns.
    frequency : int
        The frequency for annualization (default is 252 trading days).

    Returns:
    --------
    expected_returns_series : pandas Series
        Expected annualized returns for each stock.
    """
    # Compute daily returns
    returns = price_data.pct_change().dropna()

    # Get Carhart four-factor data
    factors = get_carhart_factors()

    # Align dates
    common_dates = returns.index.intersection(factors.index)
    returns = returns.loc[common_dates]
    factors = factors.loc[common_dates]

    # Ensure the indices are sorted
    returns.sort_index(inplace=True)
    factors.sort_index(inplace=True)

    # Excess returns: stock returns minus risk-free rate
    excess_returns = returns.subtract(factors['RF'], axis=0)

    # Prepare factors data
    X = factors[['Mkt-RF', 'SMB', 'HML', 'UMD']]

    # Add constant term for intercept
    X = sm.add_constant(X)

    # Compute expected factor returns (mean of factor returns)
    expected_factor_returns = factors[['Mkt-RF', 'SMB', 'HML', 'UMD']].mean()

    # Compute average risk-free rate
    avg_rf = factors['RF'].mean()

    # Prepare a Series to store the expected returns
    expected_returns = pd.Series(index=returns.columns, dtype=np.float64)

    # For each stock, perform regression and calculate expected return
    for stock in returns.columns:
        y = excess_returns[stock]

        # Fit regression model
        model_ols = sm.OLS(y, X).fit()

        # Get coefficients (including intercept)
        params = model_ols.params

        # Expected excess return = α + sum of (beta_i * E[Factor_i])
        expected_excess_return = params['const'] + params[1:].mul(expected_factor_returns).sum()

        # Expected return = expected excess return + average Risk-Free rate
        expected_return = expected_excess_return + avg_rf

        # Annualize the expected return
        expected_return_annualized = expected_return * frequency

        expected_returns[stock] = expected_return_annualized

    return expected_returns


def allocate_portfolio(stocks, budget):
    """
    Allocates the given budget across the specified stocks using the Carhart four-factor model.

    Parameters:
    -----------
    stocks : list of str
        List of stock tickers.
    budget : float
        Total budget to allocate.

    Returns:
    --------
    allocation_results : dict
        Dictionary containing weights, number of shares, and expected performance.
    """
    # Fetch historical price data (Adjust the start date as needed)
    price_data = yf.download(stocks, start='2010-01-01', end='2023-10-01')['Adj Close']
    
    # Remove timezone information from the index
    price_data.index = price_data.index.tz_localize(None)

    # Drop any stocks with all NaN values
    price_data.dropna(axis=1, how='all', inplace=True)

    # Check if any stocks remain after dropping NaNs
    if price_data.empty:
        raise ValueError("No valid stock data available after dropping NaN values.")

    # Calculate expected returns using Carhart four-factor model
    expected_returns = carhart_expected_returns(price_data, frequency=252)

    # Calculate the covariance matrix using Ledoit-Wolf shrinkage estimator
    S = risk_models.CovarianceShrinkage(price_data).ledoit_wolf()
    
    # Check covariance matrix
    print("Covariance Matrix:")
    print(S)
    eigvals = np.linalg.eigvals(S)
    print("Eigenvalues of the covariance matrix:", eigvals)
    
    if np.any(eigvals <= 0):
        print("Covariance matrix is not positive definite. Adjusting...")
        # Regularize the covariance matrix
        S += np.eye(len(S)) * 1e-6

    # Check expected returns
    print("Expected Returns:")
    print(expected_returns)

    # Initialize Efficient Frontier with expected returns and covariance matrix
    ef = EfficientFrontier(expected_returns, S)

    # Add constraints if necessary
    ef.add_constraint(lambda w: w >= 0)  # Ensure weights are non-negative (long-only)
    # ef.add_objective(objective_functions.L2_reg, gamma=1)  # Add L2 regularization if needed

    # Optimize for maximal Sharpe ratio
    weights = ef.max_sharpe()

    # Clean the weights (rounding and setting very small weights to zero)
    cleaned_weights = ef.clean_weights()

    # Convert weights to a pandas Series for better readability
    weights_series = pd.Series(cleaned_weights)

    # Calculate the number of shares to purchase for each stock
    latest_prices = price_data.iloc[-1]
    investment = weights_series * budget
    shares = (investment / latest_prices).apply(np.floor)  # Floor to get whole shares

    # Calculate the actual invested amount after buying whole shares
    invested_amount = shares * latest_prices
    remaining_budget = budget - invested_amount.sum()

    # Recalculate weights based on actual invested amount
    if invested_amount.sum() > 0:
        actual_weights = invested_amount / invested_amount.sum()
    else:
        actual_weights = invested_amount

    # Update expected performance based on actual weights
    expected_annual_return = expected_returns.dot(actual_weights)
    portfolio_volatility = np.sqrt(np.dot(actual_weights.T, np.dot(S, actual_weights))) * np.sqrt(252)
    sharpe_ratio = expected_annual_return / portfolio_volatility if portfolio_volatility != 0 else np.nan

    # Compile results into a dictionary
    allocation_results = {
        'Weights': weights_series,
        'Shares to Purchase': shares.astype(int),
        'Expected Performance': {
            'Expected Annual Return': expected_annual_return,
            'Annual Volatility': portfolio_volatility,
            'Sharpe Ratio': sharpe_ratio
        },
        'Remaining Budget': remaining_budget
    }

    allocation_results = {
        'Weights': weights_series.to_dict(),
        'Shares to Purchase': shares.astype(int).to_dict(),
        'Expected Performance': {
            'Expected Annual Return': expected_annual_return,
            'Annual Volatility': portfolio_volatility,
            'Sharpe Ratio': sharpe_ratio
        },
        'Remaining Budget': remaining_budget
    }

    return allocation_results







# Define your stock tickers and budget
# STOCK_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN']
# BUDGET = 10000


# if __name__ == "__main__":
#     # Example usage with global variables
#     try:
#         results = allocate_portfolio(STOCK_TICKERS, BUDGET)
#     except Exception as e:
#         print(f"Error: {e}")
