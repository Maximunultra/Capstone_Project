import express from "express";
import multer from "multer";
import bcrypt from 'bcrypt';
import { supabase } from "../server.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to hash passwords
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

// ✅ Helper: validate Philippine phone number (11 digits, starts with 09)
function validatePhoneNumber(phone) {
  if (!phone) return null;
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length !== 11) {
    return 'Phone number must be exactly 11 digits';
  }
  if (!digitsOnly.startsWith('09')) {
    return 'Phone number must start with 09';
  }
  return null; // null = valid
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

    if (error) throw error;

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
    const {
      full_name, email, password, role, phone,
      address, birthdate, profile_image,
      proof_document, valid_id_front, valid_id_back
    } = req.body;

    // Required fields
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ 
        error: "full_name, email, password, and role are required." 
      });
    }

    // Validate role
    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ 
        error: "Role must be either 'buyer' or 'seller'" 
      });
    }

    // ✅ Validate phone number if provided
    if (phone) {
      const phoneError = validatePhoneNumber(phone);
      if (phoneError) {
        return res.status(400).json({ error: phoneError });
      }
    }

    // ✅ Validate birthdate if provided
    if (birthdate) {
      const birthDate = new Date(birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

      if (actualAge < 18) {
        return res.status(400).json({ 
          error: "You must be at least 18 years old to register" 
        });
      }
    }

    // Require documents for sellers
    if (role === 'seller') {
      if (!proof_document) {
        return res.status(400).json({ 
          error: "Barangay certificate or proof of residence is required for sellers" 
        });
      }
      if (!valid_id_front) {
        return res.status(400).json({ 
          error: "Valid ID front photo is required for sellers" 
        });
      }
      if (!valid_id_back) {
        return res.status(400).json({ 
          error: "Valid ID back photo is required for sellers" 
        });
      }
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

    // Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(password);

    // ✅ Create user data including birthdate
    const userData = {
      full_name,
      email,
      password_hash: hashedPassword,
      role,
      phone: phone || null,
      address: address || null,
      birthdate: birthdate || null,        // ✅ Include birthdate
      profile_image: profile_image || null,
      proof_document: proof_document || null,
      valid_id_front: valid_id_front || null,
      valid_id_back: valid_id_back || null,
      approval_status: role === 'seller' ? 'pending' : 'approved',
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
    const {
      full_name, email, password, role, phone,
      address, birthdate, profile_image,
      proof_document, valid_id_front, valid_id_back
    } = req.body;

    // ✅ Validate phone if being updated
    if (phone) {
      const phoneError = validatePhoneNumber(phone);
      if (phoneError) {
        return res.status(400).json({ error: phoneError });
      }
    }

    // ✅ Validate birthdate if being updated
    if (birthdate) {
      const birthDate = new Date(birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

      if (actualAge < 18) {
        return res.status(400).json({ 
          error: "You must be at least 18 years old" 
        });
      }
    }

    const updateFields = {};
    if (full_name) updateFields.full_name = full_name;
    if (email) updateFields.email = email;

    if (password) {
      console.log('🔐 Hashing new password for update...');
      updateFields.password_hash = await hashPassword(password);
    }

    if (role) {
      if (!['buyer', 'seller'].includes(role)) {
        return res.status(400).json({ 
          error: "Role must be either 'buyer' or 'seller'" 
        });
      }
      updateFields.role = role;
    }

    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (birthdate !== undefined) updateFields.birthdate = birthdate;   // ✅ Handle birthdate update
    if (profile_image !== undefined) updateFields.profile_image = profile_image;
    if (proof_document !== undefined) updateFields.proof_document = proof_document;
    if (valid_id_front !== undefined) updateFields.valid_id_front = valid_id_front;
    if (valid_id_back !== undefined) updateFields.valid_id_back = valid_id_back;

    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ User updated successfully');
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

    const { data: user } = await supabase
      .from("users")
      .select("profile_image, proof_document, valid_id_front, valid_id_back")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;

    if (user) {
      const imagesToDelete = [];
      if (user.profile_image) imagesToDelete.push(`profiles/${user.profile_image.split('/').pop()}`);
      if (user.proof_document) imagesToDelete.push(`profiles/${user.proof_document.split('/').pop()}`);
      if (user.valid_id_front) imagesToDelete.push(`profiles/${user.valid_id_front.split('/').pop()}`);
      if (user.valid_id_back) imagesToDelete.push(`profiles/${user.valid_id_back.split('/').pop()}`);

      if (imagesToDelete.length > 0) {
        try {
          await supabase.storage.from('user-profile-images').remove(imagesToDelete);
        } catch (storageError) {
          console.error('Error deleting user images:', storageError);
        }
      }
    }

    console.log('✅ User deleted successfully');
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('❌ User deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve or reject a seller
router.patch("/:id/approval", async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(approval_status)) {
      return res.status(400).json({ 
        error: "approval_status must be 'approved', 'rejected', or 'pending'" 
      });
    }

    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("role, approval_status")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { data, error } = await supabase
      .from("users")
      .update({ approval_status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ User ${approval_status} successfully`);
    const { password_hash, ...userResponse } = data;
    res.json(userResponse);
  } catch (error) {
    console.error('❌ Approval update error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;