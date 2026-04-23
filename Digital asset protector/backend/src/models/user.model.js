import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema({
    // ========== PERSONAL INFORMATION ==========
    firstName: {
        type: String,
        required: true,
        trim: true
        // whitespace remove kr dega dono sides se ji "  John  " se "John"
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    
    // ========== AUTHENTICATION ==========
    email: {
        type: String,
        required: true,
        unique: true,
        // ye email unique hona chahiye taaki same email se dusra account na ban jaye
        lowercase: true,
        // email ko lowercase me store kr rhe h taaki case-insensitive search ho jaye example: Test@gmail.com = test@gmail.com
        match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
        // email validation regex - format check kr rha h
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        // weak passwords se bachne ke liye minimum 6 characters
        select: false
        // select false se ye field by default queries me nhi aata taaki password expose na ho
        // explicitly select("+password") karna padta h agar password chahiye
    },
    
    // ========== OPTIONAL FIELDS ==========
    phone: {
        type: String,
        default: null
    },
    company: {
        type: String,
        default: null
    },
    
    // ========== ACCOUNT SETTINGS ==========
    role: {
        type: String,
        enum: ["user", "admin"],
        // role sirf "user" ya "admin" ho sakti h
        default: "user"
        // default "user" h hum admin nahi ban skte by default
    },
    isActive: {
        type: Boolean,
        default: true
        // account active h ya nhi - admin account ko deactivate kr sakta h
    },
    profileImage: {
        type: String,
        default: null
        // user ka profile picture URL (cloudinary ya kahi aur se)
    },
    
    // ========== TIMESTAMPS ==========
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ========== PRE-SAVE HOOK ==========
// save hone se pehle ye middleware execute hota h
userSchema.pre("save", async function(next) {
    // is middleware me this user object ko represent krta h
    
    if (!this.isModified("password")) {
        // agr password modify nhi hua to firse hash krne ki zarurat nhi h
        // example: user apni email update kr rha h to password ko rehash kyo kren
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        // 10 salt rounds use kr rhe h - jyada rounds matlab jyada secure lekin slow
        
        this.password = await bcrypt.hash(this.password, salt);
        // password ko hash kr rhe h aur encrypted password ko this.password me store kr rhe h
        
        next();
    } catch (error) {
        next(error);
        // agr error aaye to error ke saath next() call kr rhe h
    }
});

// ========== CUSTOM METHODS ==========

// Password comparison method
userSchema.methods.matchPassword = async function(enteredPassword) {
    // ye method check krta h ki enter kiya gaya password ke sath database ka hash wala password match krta h
    return await bcrypt.compare(enteredPassword, this.password);
    // bcrypt.compare plaintext password ko encrypted password ke saath compare krta h aur true/false return krta h
};

// Get user without password
userSchema.methods.toJSON = function() {
    // ye method user object ko JSON me convert krta h lekin password field exclude krte hue
    const { password, ...user } = this.toObject();
    // password ko destruct kr rhe h aur baaki fields ko user me store kr rhe h
    return user;
};

export const User = mongoose.model("User", userSchema);
// ye User model h joh database table "users" ko represent krta h
// export const se - import krte waqt { User } likhna padta h


