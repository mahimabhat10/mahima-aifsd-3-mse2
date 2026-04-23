require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const EMAIL_REGEX = /.+\@.+\..+/;
const GRIEVANCE_CATEGORIES = ["Academic", "Hostel", "Transport", "Other"];
const GRIEVANCE_STATUSES = ["Pending", "Resolved"];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeCategory = (value) => {
  if (typeof value !== "string") return "";
  const formatted = value.trim().toLowerCase();
  if (formatted === "academic") return "Academic";
  if (formatted === "hostel") return "Hostel";
  if (formatted === "transport") return "Transport";
  if (formatted === "other") return "Other";
  return "";
};
const normalizeStatus = (value) => {
  if (typeof value !== "string") return "";
  const formatted = value.trim().toLowerCase();
  if (formatted === "pending") return "Pending";
  if (formatted === "resolved") return "Resolved";
  return "";
};

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
  },
  { timestamps: true }
);

studentSchema.pre("save", async function preSavePassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

studentSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

const Student = mongoose.model("Student", studentSchema);

const grievanceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: GRIEVANCE_CATEGORIES,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    status: {
      type: String,
      enum: GRIEVANCE_STATUSES,
      default: "Pending",
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
  },
  { timestamps: true }
);

const Grievance = mongoose.model("Grievance", grievanceSchema);

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing or malformed" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Student.findById(decoded.studentId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User does not exist" });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired. Please login again." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(500).json({ message: "Authentication failed", error: error.message });
  }
};

app.get("/", (req, res) => {
  res.json({ message: "Student Grievance Management API is running" });
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingStudent = await Student.findOne({ email: email.toLowerCase() });
    if (existingStudent) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = new Student({ name, email, password });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((item) => item.message)
        .join(", ");
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await Student.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ studentId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.post("/api/grievances", authMiddleware, async (req, res) => {
  try {
    const { title, description, category, date, status } = req.body;
    const normalizedCategory = normalizeCategory(category);
    const normalizedStatus = typeof status === "undefined" ? "Pending" : normalizeStatus(status);

    if (!title || !description || !normalizedCategory) {
      return res.status(400).json({
        message: "Title, description and valid category are required",
      });
    }
    if (!normalizedStatus) {
      return res.status(400).json({ message: "Status must be Pending or Resolved" });
    }

    const parsedDate = date ? new Date(date) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Date must be a valid date" });
    }

    const grievance = await Grievance.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category: normalizedCategory,
      date: parsedDate,
      status: normalizedStatus,
      student: req.userId,
    });

    const grievanceWithOwner = await Grievance.findById(grievance._id).populate("student", "name email");

    return res.status(201).json({ message: "Grievance submitted successfully", grievance: grievanceWithOwner });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((item) => item.message)
        .join(", ");
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Failed to submit grievance", error: error.message });
  }
});

app.get("/api/grievances", authMiddleware, async (req, res) => {
  try {
    const grievances = await Grievance.find({ student: req.userId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    return res.json({ count: grievances.length, grievances });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch grievances", error: error.message });
  }
});

app.get("/api/grievances/search", authMiddleware, async (req, res) => {
  try {
    const { title } = req.query;

    if (!title) {
      return res.status(400).json({ message: "Provide title query parameter" });
    }

    const grievances = await Grievance.find({
      student: req.userId,
      title: { $regex: escapeRegex(title), $options: "i" },
    })
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    return res.json({ count: grievances.length, grievances });
  } catch (error) {
    return res.status(500).json({ message: "Failed to search grievances", error: error.message });
  }
});

app.get("/api/grievances/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid grievance ID" });
    }

    const grievance = await Grievance.findOne({ _id: id, student: req.userId }).populate(
      "student",
      "name email"
    );
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    return res.json({ grievance });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch grievance", error: error.message });
  }
});

app.put("/api/grievances/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid grievance ID" });
    }

    const grievance = await Grievance.findOne({ _id: id, student: req.userId });
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    const { title, description, category, date, status } = req.body;

    if (typeof title !== "undefined") grievance.title = String(title).trim();
    if (typeof description !== "undefined") grievance.description = String(description).trim();

    if (typeof category !== "undefined") {
      const normalizedCategory = normalizeCategory(category);
      if (!normalizedCategory) {
        return res
          .status(400)
          .json({ message: "Category must be Academic, Hostel, Transport or Other" });
      }
      grievance.category = normalizedCategory;
    }

    if (typeof status !== "undefined") {
      const normalizedStatus = normalizeStatus(status);
      if (!normalizedStatus) {
        return res.status(400).json({ message: "Status must be Pending or Resolved" });
      }
      grievance.status = normalizedStatus;
    }

    if (typeof date !== "undefined") {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Date must be a valid date" });
      }
      grievance.date = parsedDate;
    }

    await grievance.save();
    const updatedGrievance = await Grievance.findById(id).populate("student", "name email");
    return res.json({ message: "Grievance updated successfully", grievance: updatedGrievance });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((item) => item.message)
        .join(", ");
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Failed to update grievance", error: error.message });
  }
});

app.delete("/api/grievances/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid grievance ID" });
    }

    const grievance = await Grievance.findOne({ _id: id, student: req.userId });
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    await Grievance.findByIdAndDelete(id);
    return res.json({ message: "Grievance deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete grievance", error: error.message });
  }
});

app.post("/api/logout", authMiddleware, async (req, res) => {
  res.json({ message: "Logout successful" });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 7000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

startServer();
