from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import mysql.connector
from mysql.connector import errorcode
from datetime import date

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Needed for flash messages

# Database configuration
db_config = {
    "user": "root",  # Use your MySQL username
    "password": "Narwhals@123",  # Use your MySQL password
    "host": "localhost",
    "database": "blinktalk_db",
}


def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    form_data = {}  # Dictionary to pass form data back to the template
    if request.method == "POST":
        # Get form data and store it in form_data so it can be re-used in the template
        form_data = request.form.to_dict()
        username = form_data.get("username", "")
        password = form_data.get("password", "")
        confirm = form_data.get("confirm", "")
        email = form_data.get("email", "")
        phone = form_data.get("phone", "")
        month = form_data.get("month", "")
        day = form_data.get("day", "")
        year = form_data.get("year", "")

        # Check that all required fields are filled out
        if not (
            username
            and password
            and confirm
            and email
            and phone
            and month
            and day
            and year
        ):
            flash("Please fill out all required fields!")
            return render_template("register.html", form_data=form_data)

        # Check if passwords match
        if password != confirm:
            flash("Passwords do not match!")
            return render_template("register.html", form_data=form_data)

        # Convert username to lowercase for case-insensitive check
        lowercase_username = username.lower()

        # Convert DOB into a date object
        try:
            dob = date(int(year), int(month), int(day))
        except ValueError:
            flash("Invalid date of birth!")
            return render_template("register.html", form_data=form_data)

        # Connect to MySQL
        conn = get_db_connection()
        if conn is None:
            flash("Database connection error!")
            return render_template("register.html", form_data=form_data)
        cursor = conn.cursor()

        # Check if the username already exists (case-insensitive)
        check_query = "SELECT id FROM users WHERE LOWER(username) = %s"
        cursor.execute(check_query, (lowercase_username,))
        if cursor.fetchone():
            flash("Username already exists!")
            cursor.close()
            conn.close()
            return render_template("register.html", form_data=form_data)

        # Insert new user into the table (Note: For production, hash the password!)
        insert_query = "INSERT INTO users (username, password, email, phone, dob) VALUES (%s, %s, %s, %s, %s)"
        cursor.execute(insert_query, (lowercase_username, password, email, phone, dob))
        conn.commit()

        cursor.close()
        conn.close()

        flash("Account created successfully! Please log in.")
        return redirect(url_for("login"))

    # For GET requests or if there was a validation error, re-render the form with current form_data
    return render_template("register.html", form_data=form_data)


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        flash("Login functionality will be implemented soon.")
        return redirect(url_for("login"))
    return render_template("login.html")


@app.route("/check_username", methods=["POST"])
def check_username():
    data = request.get_json()
    username = data.get("username", "").lower()

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection error"}), 500
    cursor = conn.cursor()
    query = "SELECT id FROM users WHERE LOWER(username) = %s"
    cursor.execute(query, (username,))
    exists = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return jsonify({"exists": exists})


if __name__ == "__main__":
    app.run(debug=True)
