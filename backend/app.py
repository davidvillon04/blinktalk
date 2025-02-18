from flask import Flask, render_template, request, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Needed for flash messages

# In-memory storage for users (username: password)
users = {}


@app.route("/")
def index():
    # Landing page: ask the user to sign in or create an account
    return render_template("index.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        # Get form data
        username = request.form.get("username")
        password = request.form.get("password")
        confirm = request.form.get("confirm")

        # Check if passwords match
        if password != confirm:
            flash("Passwords do not match!")
            return redirect(url_for("register"))

        # Check if username is already taken
        if username in users:
            flash("Username already exists!")
            return redirect(url_for("register"))

        # Create the account (Note: In production, hash your passwords!)
        users[username] = password
        flash("Account created successfully! Please log in.")
        return redirect(url_for("login"))

    # GET request renders the registration form
    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        # Here you would add your login logic later
        # For now, just a placeholder message
        flash("Login functionality will be implemented soon.")
        return redirect(url_for("login"))
    return render_template("login.html")


if __name__ == "__main__":
    app.run(debug=True)
