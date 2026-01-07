import express from "express";
import multer from "multer";
import bcrypt from 'bcrypt';
import { supabase } from "../server.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to hash passwords (same as server.js)
async function hashPassword(password) {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

// Helper function to upload image to Supabase Storage
const uploadImageToSupabase = async (file, userId) => {
  try {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId || 'temp'}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { data, error } = await supabase.storage
      .from('user-profile-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('user-profile-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Image upload endpoint
router.post("/upload", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const imageUrl = await uploadImageToSupabase(req.file);
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    
    if (error) throw error;
    
    // Remove password_hash from all users before sending
    const usersWithoutPasswords = data.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new user
router.post("/", async (req, res) => {
  try {
    console.log('📝 User registration request received');
    const { full_name, email, password, role, phone, address, profile_image } = req.body;
    
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ 
        error: "full_name, email, password, and role are required." 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters long" 
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    // Hash the password before storing
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('✅ Password hashed, length:', hashedPassword.length);

    // Create user data object
    const userData = {
      full_name,
      email,
      password_hash: hashedPassword,
      role,
      phone: phone || null,
      address: address || null,
      profile_image: profile_image || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Creating user in database...');
    const { data, error } = await supabase
      .from("users")
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ User created successfully:', data.email);

    // Don't return the password hash in the response
    const { password_hash, ...userResponse } = data;
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('❌ User creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single user by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "User not found" });
    }

    // Don't return the password hash in the response
    const { password_hash, ...userResponse } = data;
    res.json(userResponse);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, password, role, phone, address, profile_image } = req.body;
    
    const updateFields = {};
    if (full_name) updateFields.full_name = full_name;
    if (email) updateFields.email = email;
    
    // Hash password if it's being updated
    if (password) {
      console.log('🔐 Hashing new password for update...');
      updateFields.password_hash = await hashPassword(password);
      console.log('✅ Password hashed for update');
    }
    
    if (role) updateFields.role = role;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (profile_image !== undefined) updateFields.profile_image = profile_image;

    // Add updated timestamp
    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ User updated successfully');
    
    // Don't return the password hash in the response
    const { password_hash, ...userResponse } = data;
    res.json(userResponse);
  } catch (error) {
    console.error('❌ User update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the user to check if they have a profile image
    const { data: user } = await supabase
      .from("users")
      .select("profile_image")
      .eq("id", id)
      .single();

    // Delete the user
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // If user had a profile image, delete it from storage
    if (user && user.profile_image) {
      try {
        const imagePath = user.profile_image.split('/').pop();
        await supabase.storage
          .from('user-profile-images')
          .remove([`profiles/${imagePath}`]);
      } catch (storageError) {
        console.error('Error deleting profile image:', storageError);
        // Don't fail the entire operation if image deletion fails
      }
    }

    console.log('✅ User deleted successfully');
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('❌ User deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;