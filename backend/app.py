from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    jsonify,
    session,
)
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
        # Get form data and strip whitespace for username
        form_data = request.form.to_dict()
        username = form_data.get("username", "")
        password = form_data.get("password", "")
        confirm = form_data.get("confirm", "")
        email = form_data.get("email", "")
        month = form_data.get("month", "")
        day = form_data.get("day", "")
        year = form_data.get("year", "")

        # Check that all required fields are filled out
        if not (username and password and confirm and email and month and day and year):
            form_data["error_general"] = "Please fill out all required fields!"
            return render_template("register.html", form_data=form_data)

        # Check if passwords match
        if password != confirm:
            form_data["error_password_mismatch"] = "Passwords do not match."
            return render_template("register.html", form_data=form_data)

        # Convert username to lowercase for case-insensitive check
        lowercase_username = username.lower()

        # Convert DOB into a date object
        try:
            dob = date(int(year), int(month), int(day))
        except ValueError:
            form_data["error_dob"] = "Invalid date of birth!"
            return render_template("register.html", form_data=form_data)

        # Connect to MySQL
        conn = get_db_connection()
        if conn is None:
            form_data["error_general"] = "Database connection error!"
            return render_template("register.html", form_data=form_data)
        cursor = conn.cursor()

        # Check if the username already exists (case-insensitive)
        check_user_query = "SELECT id FROM users WHERE LOWER(username) = %s"
        cursor.execute(check_user_query, (lowercase_username,))
        if cursor.fetchone():
            form_data["error_username_taken"] = "Username is already taken."
            cursor.close()
            conn.close()
            return render_template("register.html", form_data=form_data)

        # Check if the email already exists (case-insensitive)
        check_email_query = "SELECT id FROM users WHERE LOWER(email) = LOWER(%s)"
        cursor.execute(check_email_query, (email.lower(),))
        if cursor.fetchone():
            form_data["error_email_taken"] = "Email is already registered."
            cursor.close()
            conn.close()
            return render_template("register.html", form_data=form_data)

        # Insert new user into the table (Note: For production, hash the password!)
        insert_query = (
            "INSERT INTO users (username, password, email, dob) VALUES (%s, %s, %s, %s)"
        )
        cursor.execute(insert_query, (lowercase_username, password, email, dob))
        conn.commit()

        cursor.close()
        conn.close()

        return redirect(url_for("new_user"))

    # For GET requests or validation errors, re-render the form with current form_data
    return render_template("register.html", form_data=form_data)


@app.route("/login", methods=["GET", "POST"])
def login():
    form_data = {}
    if request.method == "POST":
        # 1. Get form inputs
        form_data = request.form.to_dict()
        email_or_username = form_data.get("email_or_username", "")
        password = form_data.get("password", "")

        # 2. Check if fields are empty
        if not email_or_username or not password:
            # We'll store the error in form_data and re-render login.html
            form_data["error_login"] = "Please fill out all fields."
            return render_template("login.html", form_data=form_data)

        # 3. Connect to the database
        conn = get_db_connection()
        if conn is None:
            form_data["error_login"] = "Database connection error!"
            return render_template("login.html", form_data=form_data)

        cursor = conn.cursor(dictionary=True)  # dictionary=True => results as dict

        # 4. Query for a user whose username or email matches
        check_query = """
            SELECT id, username, password
            FROM users
            WHERE LOWER(username) = LOWER(%s) OR LOWER(email) = LOWER(%s)
        """
        cursor.execute(check_query, (email_or_username, email_or_username))
        user_row = cursor.fetchone()

        if not user_row:
            # No user found
            form_data["error_login"] = "Invalid username/email or password."
            cursor.close()
            conn.close()
            return render_template("login.html", form_data=form_data)

        # 5. Compare the plain-text password
        # (For production, you'd store a hashed password and use a library like bcrypt to check.)
        if password != user_row["password"]:
            form_data["error_login"] = "Invalid username/email or password."
            cursor.close()
            conn.close()
            return render_template("login.html", form_data=form_data)

        # 6. If valid, store user info in session
        session["user_id"] = user_row["id"]
        # (Optionally store session["username"] = user_row["username"] if you want to greet by name)

        cursor.close()
        conn.close()

        # 7. Redirect to user_home
        return redirect(url_for("user_home"))

    # GET request or re-render
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
            return redirect(url_for("user_home"))

        # Process the uploaded file
        if "profile_pic" not in request.files:
            flash("No file part in the request!")
            return redirect(request.url)

        file = request.files["profile_pic"]
        if file.filename == "":
            flash("Please upload a file before uploading!")
            return redirect(request.url)

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
            return redirect(url_for("user_home"))
        else:
            flash("Invalid file type! Allowed types: png, jpg, jpeg, gif.")
            return redirect(request.url)
    return render_template("new_user.html")


@app.route("/user_home")
def user_home():
    if "user_id" not in session:
        flash("Please log in first.")
        return redirect(url_for("login"))
    # Optionally, fetch user info from DB or session to greet them by name
    return render_template("user_home.html")


if __name__ == "__main__":
    app.run(debug=True)
