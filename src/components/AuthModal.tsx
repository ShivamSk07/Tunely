"use client"

import React, { useState } from "react"
import { signIn } from "next-auth/react"
import { X, User, Mail, Lock, Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react"
import { usePlayerStore } from "@/store/usePlayerStore"
import toast from "react-hot-toast"
import Logo from "@/components/Logo"

type TabType = "login" | "signup" | "demo"

export default function AuthModal() {
  const isAuthModalOpen = usePlayerStore((state) => state.isAuthModalOpen)
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("login")
  
  // Custom inputs
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  if (!isAuthModalOpen) return null

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (activeTab === "signup") {
        // Sign Up Flow
        if (!name.trim() || !email.trim() || !password) {
          toast.error("Please fill in all fields.")
          setIsLoading(false)
          return
        }

        if (password.length < 6) {
          toast.error("Password must be at least 6 characters long.")
          setIsLoading(false)
          return
        }

        // Call the signup API
        const signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        })

        const signupData = await signupRes.json()

        if (!signupRes.ok) {
          throw new Error(signupData.error || "Signup failed.")
        }

        toast.success("Account created successfully!")
        
        // Auto sign-in the newly registered user
        const res = await signIn("credentials", {
          email: email.toLowerCase().trim(),
          password,
          redirect: false,
        })

        if (res?.error) {
          toast.error("Auto login failed, please log in manually.")
          setActiveTab("login")
        } else {
          toast.success(`Welcome to Tunely, ${name}!`)
          setAuthModalOpen(false)
          window.location.reload()
        }
      } else if (activeTab === "login") {
        // Login Flow
        if (!email.trim() || !password) {
          toast.error("Please enter both email and password.")
          setIsLoading(false)
          return
        }

        const res = await signIn("credentials", {
          email: email.toLowerCase().trim(),
          password,
          redirect: false,
        })

        if (res?.error) {
          toast.error(res.error || "Invalid email or password.")
        } else {
          toast.success("Successfully logged in!")
          setAuthModalOpen(false)
          window.location.reload()
        }
      } else if (activeTab === "demo") {
        // One-Click Demo Flow
        const res = await signIn("credentials", {
          email: "demo@tunely.com",
          password: "demopassword123",
          redirect: false,
        })

        if (res?.error) {
          toast.error("Failed to start Demo evaluation.")
        } else {
          toast.success("Welcome to Demo Mode!")
          setAuthModalOpen(false)
          window.location.reload()
        }
      }
    } catch (error) {
      const err = error as Error
      toast.error(err.message || "An unexpected error occurred.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div 
        className="relative w-full max-w-md overflow-hidden bg-[#0A0A0F] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(108,99,255,0.25)] p-8 flex flex-col items-center animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient light behind */}
        <div className="absolute -top-24 w-72 h-72 rounded-full bg-[#6C63FF]/15 blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all duration-200"
        >
          <X size={16} />
        </button>

        {/* Branded Icon */}
        <Logo size={56} className="mb-4" />

        <h3 className="text-2xl font-black text-white tracking-tight">
          {activeTab === "signup" ? "Create your Account" : activeTab === "demo" ? "Instant Premium Pass" : "Unlock Tunely Premium"}
        </h3>
        <p className="text-gray-400 text-center text-xs mt-2 mb-6 leading-relaxed max-w-xs select-none">
          Sign in to save liked songs, create customized playlists, and personalize your streaming queue on Neon.
        </p>

        {/* Auth Type Switcher */}
        <div className="flex bg-white/5 p-1 rounded-full border border-white/5 w-full mb-6 select-none">
          <button
            onClick={() => {
              setActiveTab("login")
              setPassword("")
            }}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
              activeTab === "login"
                ? "bg-gradient-to-r from-[#6C63FF] to-[#8c82ff] text-white shadow-md shadow-[#6C63FF22]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setActiveTab("signup")
              setPassword("")
            }}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
              activeTab === "signup"
                ? "bg-gradient-to-r from-[#6C63FF] to-[#8c82ff] text-white shadow-md shadow-[#6C63FF22]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setActiveTab("demo")}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
              activeTab === "demo"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Demo Pass
          </button>
        </div>

        {/* Inputs & Form */}
        <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
          {activeTab === "signup" && (
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                required
                placeholder="Full Name (e.g. Shivam Kothekar)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl text-xs font-semibold outline-none focus:border-[#6C63FF] transition-all"
              />
            </div>
          )}

          {activeTab !== "demo" ? (
            <div className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl text-xs font-semibold outline-none focus:border-[#6C63FF] transition-all"
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password (Min. 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl text-xs font-semibold outline-none focus:border-[#6C63FF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-2 select-none">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6C63FF] bg-[#6C63FF]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Sparkles size={10} /> Instant Test Mode
              </span>
              <p className="text-xs font-semibold text-white">Demo Account Login</p>
              <p className="text-[10px] text-gray-500 leading-relaxed max-w-[280px] mx-auto">
                Logs in as <span className="text-white/60 font-semibold">demo@tunely.com</span> with premium playlist saving & dynamic Postgres cloud syncing enabled.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white font-bold rounded-xl text-xs transition duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-[#6C63FF22]"
          >
            {activeTab === "signup" 
              ? "Create Account" 
              : activeTab === "login" 
                ? "Log In to Tunely" 
                : "Log In Instantly"} 
            <ArrowRight size={13} />
          </button>
        </form>

        <p className="mt-6 text-[10px] text-center text-gray-500 font-medium select-none">
          Secure Postgres TLS link. Dynamic schema validation verified.
        </p>
      </div>
    </div>
  )
}
