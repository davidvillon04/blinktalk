from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import mysql.connector
from mysql.connector import errorcode
from datetime import date
import os
from werkzeug.utils import secure_filename

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


# Configure an upload folder for profile pictures
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "static", "profile_pics")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


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
        form_data = request.form.to_dict()
        username = form_data.get("username", "")
        password = form_data.get("password", "")
        confirm = form_data.get("confirm", "")
        email = form_data.get("email", "")
        month = form_data.get("month", "")
        day = form_data.get("day", "")
        year = form_data.get("year", "")

        if not (username and password and confirm and email and month and day and year):
            form_data["error_general"] = "Please fill out all required fields!"
            return render_template("register.html", form_data=form_data)

        if password != confirm:
            form_data["error_password_mismatch"] = "Passwords do not match."
            return render_template("register.html", form_data=form_data)

        lowercase_username = username.lower()

        try:
            dob = date(int(year), int(month), int(day))
        except ValueError:
            form_data["error_dob"] = "Invalid date of birth!"
            return render_template("register.html", form_data=form_data)

        conn = get_db_connection()
        if conn is None:
            form_data["error_general"] = "Database connection error!"
            return render_template("register.html", form_data=form_data)
        cursor = conn.cursor()

        check_user_query = "SELECT id FROM users WHERE LOWER(username) = %s"
        cursor.execute(check_user_query, (lowercase_username,))
        if cursor.fetchone():
            form_data["error_username_taken"] = "Username is already taken."
            cursor.close()
            conn.close()
            return render_template("register.html", form_data=form_data)

        check_email_query = "SELECT id FROM users WHERE LOWER(email) = LOWER(%s)"
        cursor.execute(check_email_query, (email.lower(),))
        if cursor.fetchone():
            form_data["error_email_taken"] = "Email is already registered."
            cursor.close()
            conn.close()
            return render_template("register.html", form_data=form_data)

        insert_query = (
            "INSERT INTO users (username, password, email, dob) VALUES (%s, %s, %s, %s)"
        )
        cursor.execute(insert_query, (lowercase_username, password, email, dob))
        conn.commit()
        cursor.close()
        conn.close()

        flash(
            "Account created successfully! Please set your profile picture, or skip to do it later."
        )
        return redirect(url_for("new_user"))

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


@app.route("/check_email", methods=["POST"])
def check_email():
    data = request.get_json()
    email = data.get("email", "").lower()

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection error"}), 500
    cursor = conn.cursor()
    query = "SELECT id FROM users WHERE LOWER(email) = %s"
    cursor.execute(query, (email,))
    exists = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return jsonify({"exists": exists})


@app.route("/new_user", methods=["GET", "POST"])
def new_user():
    if request.method == "POST":
        # If the user clicks "Skip", redirect to user_home
        if "skip" in request.form:
            flash("Profile picture setup skipped.")
            return redirect(url_for("user_home"))

        # Process the uploaded file
        if "profile_pic" not in request.files:
            flash("No file part in the request!")
            return redirect(request.url)
        file = request.files["profile_pic"]
        if file.filename == "":
            flash("No file selected!")
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
            flash("Profile picture uploaded successfully!")
            return redirect(url_for("user_home"))
        else:
            flash("Invalid file type! Allowed types: png, jpg, jpeg, gif.")
            return redirect(request.url)
    return render_template("new_user.html")


@app.route("/user_home")
def user_home():
    # A simple placeholder for the user's home page.
    return render_template("user_home.html")


if __name__ == "__main__":
    app.run(debug=True)
