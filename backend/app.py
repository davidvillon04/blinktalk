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
from flask_socketio import SocketIO, emit, join_room, leave_room

import mysql.connector
from mysql.connector import errorcode
from datetime import date
import os
from werkzeug.utils import secure_filename

basedir = os.path.abspath(os.path.dirname(__file__))

# Explicitly set the template folder.
app = Flask(__name__, template_folder=os.path.join(basedir, "templates"))
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev_secret_key") # Needed for flash messages
socketio = SocketIO(app, cors_allowed_origins="*")
# Determine the directory where app.py is located.


# Database configuration
db_config = {
    "user": "davidv04",  # Your MySQL username
    "password": "Narwhals123",  # Your MySQL password
    "host": "blinktalk-db.ctckoqcim7bq.us-east-2.rds.amazonaws.com",
    "database": "blinktalk-db",
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
    form_data = {}
    if request.method == "POST":
        form_data = request.form.to_dict()
        username = form_data.get("username", "")
        password = form_data.get("password", "")
        confirm = form_data.get("confirm", "")
        email = form_data.get("email", "")
        month = form_data.get("month", "")
        day = form_data.get("day", "")
        year = form_data.get("year", "")

        # Check that all required fields are filled
        if not (username and password and confirm and email and month and day and year):
            form_data["error_general"] = "Please fill out all required fields!"
            return render_template("register.html", form_data=form_data)

        # Check if passwords match
        if password != confirm:
            form_data["error_password_mismatch"] = "Passwords do not match."
            return render_template("register.html", form_data=form_data)

        # Convert username to lowercase for a case-insensitive check
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

        # Insert new user into the table (for production, hash the password!)
        insert_query = (
            "INSERT INTO users (username, password, email, dob) VALUES (%s, %s, %s, %s)"
        )
        cursor.execute(insert_query, (lowercase_username, password, email, dob))
        conn.commit()
        new_user_id = cursor.lastrowid

        cursor.close()
        conn.close()

        # Put the new user into session
        session["user_id"] = new_user_id

        return redirect(url_for("new_user"))

    # For GET requests or validation errors, re-render the form
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
            form_data["error_login"] = "Please fill out all fields."
            return render_template("login.html", form_data=form_data)

        # 3. Connect to DB
        conn = get_db_connection()
        if conn is None:
            form_data["error_login"] = "Database connection error!"
            return render_template("login.html", form_data=form_data)

        cursor = conn.cursor(dictionary=True)

        # 4. Query user by username/email
        check_query = """
            SELECT id, username, password
            FROM users
            WHERE LOWER(username) = LOWER(%s) OR LOWER(email) = LOWER(%s)
        """
        cursor.execute(check_query, (email_or_username, email_or_username))
        user_row = cursor.fetchone()

        if not user_row:
            form_data["error_login"] = "Invalid username/email or password."
            cursor.close()
            conn.close()
            return render_template("login.html", form_data=form_data)

        # 5. Compare plain-text password (use hashing in production)
        if password != user_row["password"]:
            form_data["error_login"] = "Invalid username/email or password."
            cursor.close()
            conn.close()
            return render_template("login.html", form_data=form_data)

        # 6. If valid, store user info in session
        session["user_id"] = user_row["id"]

        cursor.close()
        conn.close()

        # 7. Redirect to user_home
        return redirect(url_for("user_home"))

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
    if "user_id" not in session:
        flash("Please log in first.")
        return redirect(url_for("login"))

    user_id = session["user_id"]

    if request.method == "POST":
        # If user clicks "Skip", go to user_home
        if "skip" in request.form:
            return redirect(url_for("user_home"))

        if "profile_pic" not in request.files:
            flash("No file part in the request!")
            return redirect(request.url)

        file = request.files["profile_pic"]
        if file.filename == "":
            flash("Please select a file before uploading!")
            return redirect(request.url)

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
            db_file_path = os.path.join("static", "profile_pics", filename)

            conn = get_db_connection()
            if conn is None:
                flash("Database connection error!")
                return redirect(url_for("user_home"))

            cursor = conn.cursor()
            update_query = "UPDATE users SET profile_pic = %s WHERE id = %s"
            cursor.execute(update_query, (db_file_path, user_id))
            conn.commit()
            cursor.close()
            conn.close()

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

    user_id = session["user_id"]
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch username & profile pic
    cursor.execute("SELECT username, profile_pic FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    username = row["username"] if row else "User"
    profile_pic = row["profile_pic"] if row and row["profile_pic"] else None

    # Fetch the friend list
    cursor.execute(
        """
        SELECT u.id, u.username, u.profile_pic
        FROM friendships f
        JOIN users u ON (u.id = f.user1_id OR u.id = f.user2_id)
        WHERE (f.user1_id = %s OR f.user2_id = %s) AND u.id != %s
        ORDER BY u.username ASC
        """,
        (user_id, user_id, user_id),
    )
    friends = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template(
        "user_home.html", username=username, profile_pic=profile_pic, friends=friends
    )


# -----------------------
# Friend Request Endpoints
# -----------------------


@app.route("/get_friend_requests")
def get_friend_requests():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    user_id = session["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # All pending friend requests for this user
    cursor.execute(
        """
        SELECT fr.id, u.username
        FROM friend_requests fr
        JOIN users u ON fr.sender_id = u.id
        WHERE fr.receiver_id = %s AND fr.status = 'pending'
        ORDER BY u.username ASC
        """,
        (user_id,),
    )
    requests_list = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(requests_list)


@app.route("/accept_request", methods=["POST"])
def accept_request():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    request_id = request.form.get("request_id")
    user_id = session["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()
    # Mark request as accepted
    cursor.execute(
        "UPDATE friend_requests SET status = 'accepted' WHERE id = %s AND receiver_id = %s",
        (request_id, user_id),
    )
    conn.commit()

    # Insert into friendships
    cursor.execute("SELECT sender_id FROM friend_requests WHERE id = %s", (request_id,))
    row = cursor.fetchone()
    if row:
        sender_id = row[0]
        user1 = min(user_id, sender_id)
        user2 = max(user_id, sender_id)
        cursor.execute(
            """
            INSERT INTO friendships (user1_id, user2_id, last_interaction)
            VALUES (%s, %s, NOW())
            """,
            (user1, user2),
        )
        conn.commit()

    cursor.close()
    conn.close()
    return jsonify({"success": True})


@app.route("/decline_request", methods=["POST"])
def decline_request():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    request_id = request.form.get("request_id")
    user_id = session["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE friend_requests SET status = 'declined' WHERE id = %s AND receiver_id = %s",
        (request_id, user_id),
    )
    conn.commit()

    cursor.close()
    conn.close()
    return jsonify({"success": True})


@app.route("/send_friend_request", methods=["POST"])
def send_friend_request():
    # Ensure the sender is logged in
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    friend_username = data.get("friend_username", "").lower()
    if not friend_username:
        return jsonify({"error": "No username provided"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection error"}), 500
    cursor = conn.cursor(dictionary=True)

    # Look up the friend's user ID
    cursor.execute(
        "SELECT id FROM users WHERE LOWER(username) = %s", (friend_username,)
    )
    friend = cursor.fetchone()
    if not friend:
        cursor.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404

    friend_id = friend["id"]
    sender_id = session["user_id"]

    # 1. Check if already friends
    user1 = min(sender_id, friend_id)
    user2 = max(sender_id, friend_id)

    cursor.execute(
        "SELECT id FROM friendships WHERE user1_id = %s AND user2_id = %s",
        (user1, user2),
    )
    if cursor.fetchone():
        # They are already in the friendships table => already friends
        cursor.close()
        conn.close()
        return jsonify({"error": "You are already friends with this user!"}), 400

    # 2. Check if there's already a pending friend request
    cursor.execute(
        """
        SELECT id FROM friend_requests
        WHERE sender_id = %s AND receiver_id = %s AND status = 'pending'
        """,
        (sender_id, friend_id),
    )
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"error": "Friend request already sent"}), 400

    # 3. Insert the new friend request
    cursor.execute(
        "INSERT INTO friend_requests (sender_id, receiver_id) VALUES (%s, %s)",
        (sender_id, friend_id),
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True})


# -----------------------------------------------
# NEW ENDPOINT: /search_users for live dropdown
# -----------------------------------------------
@app.route("/search_users", methods=["GET"])
def search_users():
    """
    Returns up to 50 usernames that start with the given `query`.
    Excludes the currently logged-in user.
    """
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    user_id = session["user_id"]
    query = request.args.get("query", "").strip().lower()

    # If query is empty, return no results
    if not query:
        return jsonify({"results": []})

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection error"}), 500

    cursor = conn.cursor(dictionary=True)
    # We'll do 'query%' so it finds users that start with query
    like_query = query + "%"
    sql = """
        SELECT username FROM users
        WHERE LOWER(username) LIKE %s
          AND id != %s
        ORDER BY username
        LIMIT 50
    """
    cursor.execute(sql, (like_query, user_id))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Return only the usernames
    results = [row["username"] for row in rows]
    return jsonify({"results": results})


@app.route("/get_friends", methods=["GET"])
def get_friends():
    """Return the updated friend list as JSON."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    user_id = session["user_id"]

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection error"}), 500
    cursor = conn.cursor(dictionary=True)

    # Return 'friends' sorted by last_interaction DESC (newest first)
    cursor.execute(
        """
        SELECT u.id, u.username, u.profile_pic, f.last_interaction
        FROM friendships f
        JOIN users u ON (u.id = f.user1_id OR u.id = f.user2_id)
        WHERE (f.user1_id = %s OR f.user2_id = %s)
          AND u.id != %s
        ORDER BY f.last_interaction DESC
        """,
        (user_id, user_id, user_id),
    )
    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return jsonify({"friends": rows})


@app.route("/get_messages", methods=["GET"])
def get_messages():
    # 1. Check if user is logged in
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    current_user_id = session["user_id"]

    # 2. Get friend_id from the query string (e.g. /get_messages?friend_id=7)
    friend_id = request.args.get("friend_id", type=int)
    if not friend_id:
        return jsonify({"error": "No friend_id provided"}), 400

    # 3. Connect to DB
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection error"}), 500
    cursor = conn.cursor(dictionary=True)

    # 4. Fetch all messages between current_user and friend, sorted by created_at ascending
    sql = """
        SELECT
            m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
            sender.username AS sender_username,
            sender.profile_pic AS sender_profile_pic
        FROM messages m
        JOIN users sender ON sender.id = m.sender_id
        WHERE (m.sender_id = %s AND m.receiver_id = %s)
           OR (m.sender_id = %s AND m.receiver_id = %s)
        ORDER BY m.created_at ASC
    """
    cursor.execute(sql, (current_user_id, friend_id, friend_id, current_user_id))
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    # 5. Return as JSON
    return jsonify({"messages": rows})


@socketio.on("join_chat")
def handle_join_chat(data):

    room = data["room"]
    username = data.get("username", "Unknown User")
    join_room(room)
    print(f"{username} joined room {room}")


@socketio.on("send_message")
def handle_send_message(data):
    room = data["room"]
    content = data["content"]
    sender_id = data.get("sender_id")
    sender_username = data.get("sender_username", "Unknown")
    friend_id = data.get("friend_id")

    # 1) Insert into the DB
    conn = get_db_connection()
    if not conn:
        print("DB connection error in send_message socket event")
        return

    cursor = conn.cursor(dictionary=True)

    # Insert the new message
    insert_sql = """
        INSERT INTO messages (sender_id, receiver_id, content)
        VALUES (%s, %s, %s)
    """
    cursor.execute(insert_sql, (sender_id, friend_id, content))
    conn.commit()
    new_id = cursor.lastrowid

    # 3) Optionally update 'last_interaction'
    update_sql = """
        UPDATE friendships
        SET last_interaction = NOW()
        WHERE (user1_id = %s AND user2_id = %s)
          OR (user1_id = %s AND user2_id = %s)
    """
    cursor.execute(update_sql, (sender_id, friend_id, friend_id, sender_id))
    conn.commit()

    # 4) Fetch the newly inserted row, which has created_at, profile_pic, etc.
    cursor.execute(
        """
        SELECT
            m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
            sender.username AS sender_username,
            sender.profile_pic AS sender_profile_pic
        FROM messages m
        JOIN users sender ON sender.id = m.sender_id
        WHERE m.id = %s
        """,
        (new_id,),
    )
    new_msg_row = cursor.fetchone()

    cursor.close()
    conn.close()

    # Convert datetime to string:
    import datetime

    if new_msg_row and "created_at" in new_msg_row:
        if isinstance(new_msg_row["created_at"], datetime.datetime):
            # ISO format (e.g. "2025-02-19T02:00:41.123456")
            new_msg_row["created_at"] = new_msg_row["created_at"].isoformat()

    # 5) Now broadcast the full message row to the room
    socketio.emit("receive_message", new_msg_row, to=room)

    # Emit to the recipient's personal room for notifications
    recipient_personal_room = "user_" + str(friend_id)
    socketio.emit("receive_message", new_msg_row, to=recipient_personal_room)


@socketio.on("typing")
def handle_typing(data):
    room = data.get("room")
    username = data.get("username", "Unknown")
    # Broadcast to others in the room that this user is typing.
    emit("user_typing", {"username": username}, to=room, include_self=False)


@socketio.on("stop_typing")
def handle_stop_typing(data):
    room = data.get("room")
    username = data.get("username", "Unknown")
    # Broadcast to others in the room to clear the typing indicator.
    emit("user_stop_typing", {"username": username}, to=room, include_self=False)


@socketio.on("join_personal")
def handle_join_personal(data):
    room = data.get("room")
    if room:
        join_room(room)
        print(f"Client joined personal room: {room}")


# MUST BE FINAL BLOCK
if __name__ == "__main__":
    socketio.run(app, debug=True, host="127.0.0.1", port=5000)
