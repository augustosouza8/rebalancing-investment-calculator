"""
simulation_app.py

Entrypoint for the Dual-Strategy Rebalancing Calculator.
Defines and configures the Flask application.
"""

from flask import Flask

def create_app() -> Flask:
    """
    Application factory for Flask.

    Returns:
        app (Flask): Configured Flask application.
    """
    app = Flask(__name__)
    # Load config from environment or default file
    app.config.from_pyfile("config.py", silent=True)

    # Import and register routes
    from app.routes import bp as routes_bp
    app.register_blueprint(routes_bp)

    return app


# If run directly, start the dev server
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)  # debug=True for development only
