"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function CreateAccountPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setError(null);
		if (password !== confirmPassword) {
			setError("รหัสผ่านกับยืนยันรหัสผ่านไม่ตรงกัน");
			return;
		}
		if (!username || !email || !password) {
			setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
			return;
		}

		setLoading(true);
		try {
			const data = await apiFetch("/api/register", {
				method: "POST",
				body: JSON.stringify({ username, email, password })
			});
			if (!data.user) throw new Error(data.message || "ไม่สามารถสร้างบัญชีได้");
			router.push("/login");
		} catch (err) {
			setError(err instanceof Error ? err.message : "ไม่สามารถสร้างบัญชีได้");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<div className="w-full max-w-2xl flex rounded-2xl overflow-hidden shadow-lg border border-gray-200">
				<div className="flex-1 bg-white px-8 py-10 flex flex-col justify-center">
					<div className="mb-8">
						<h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Create Account</h1>
						<p className="text-sm text-gray-500">สร้างบัญชีใหม่เพื่อเข้าใช้งาน</p>
					</div>

					<div className="space-y-5">
						<div>
							<label className="block text-sm font-medium text-gray-600 mb-1.5">Username</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><UserIcon /></span>
								<input
									type="text"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="username"
									className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MailIcon /></span>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="yourname@email.com"
									className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
								<input
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									className="w-full h-10 pl-9 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
									aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
								>
									{showPassword ? <EyeOffIcon /> : <EyeIcon />}
								</button>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-600 mb-1.5">Confirm Password</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="••••••••"
									className="w-full h-10 pl-3 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
								/>
							</div>
						</div>

						<button
							onClick={handleSubmit}
							className="w-full h-10 rounded-lg bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-sm font-medium transition-all"
						>
							Create account
						</button>
						<div className="mt-4 text-center">
							<Link href="/login" className="text-sm font-medium text-indigo-600 hover:underline">มีบัญชีแล้ว? เข้าสู่ระบบ</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ───────── Inline SVG Icons (re-used from login) ───────── */

function UserIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	)
}

function MailIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
		</svg>
	);
}

function LockIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<rect x="3" y="11" width="18" height="11" rx="2" />
			<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		</svg>
	);
}

function EyeIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

function EyeOffIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
			<line x1="1" y1="1" x2="23" y2="23" />
		</svg>
	);
}
