#!/usr/bin/env python3
"""
Dubbing-Gholam Permanent Offline License Generator (GUI Application)
Designed exclusively for the Software Owner.
"""

import os
import sys
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from license_engine import (
    PRODUCT_NAME,
    load_or_generate_master_keys,
    verify_activation_request,
    generate_signed_license
)

class LicenseGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.root.title(f"{PRODUCT_NAME} — Permanent License Generator (Owner Tool)")
        self.root.geometry("740x680")
        self.root.minsize(700, 640)
        self.root.configure(bg="#0f172a") # Slate 900

        self.current_req_data = None
        self.current_req_path = None

        # Ensure master key is loaded or generated
        try:
            self.priv_key, self.pub_key = load_or_generate_master_keys()
            self.key_status = "Master Key Pair Active (Ed25519)"
            self.key_status_color = "#34d399" # Emerald
        except Exception as e:
            self.key_status = f"Key Error: {str(e)}"
            self.key_status_color = "#f87171" # Rose

        self.setup_styles()
        self.build_ui()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure("TFrame", background="#0f172a")
        style.configure("Card.TFrame", background="#1e293b", relief="flat")
        style.configure("TLabel", background="#0f172a", foreground="#f8fafc", font=("Segoe UI", 10))
        style.configure("CardLabel.TLabel", background="#1e293b", foreground="#e2e8f0", font=("Segoe UI", 9))
        style.configure("Header.TLabel", background="#0f172a", foreground="#ffffff", font=("Segoe UI", 14, "bold"))
        style.configure("SubHeader.TLabel", background="#1e293b", foreground="#38bdf8", font=("Segoe UI", 11, "bold"))

        style.configure(
            "Accent.TButton",
            background="#099767",
            foreground="#ffffff",
            font=("Segoe UI", 10, "bold"),
            padding=(16, 8),
            borderwidth=0
        )
        style.map("Accent.TButton", background=[("active", "#0ba873")])

        style.configure(
            "Secondary.TButton",
            background="#334155",
            foreground="#ffffff",
            font=("Segoe UI", 9),
            padding=(12, 6),
            borderwidth=0
        )
        style.map("Secondary.TButton", background=[("active", "#475569")])

    def build_ui(self):
        # Main padding container
        main_frame = ttk.Frame(self.root, padding=20)
        main_frame.pack(fill="both", expand=True)

        # Header Title
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill="x", pady=(0, 15))

        title = ttk.Label(header_frame, text=f"🔑 {PRODUCT_NAME} — ابزار صدور لایسنس دائمی آفلاین", style="Header.TLabel")
        title.pack(anchor="w")

        subtitle = ttk.Label(
            header_frame,
            text=f"وضعیت کلید امضا: {self.key_status}",
            foreground=self.key_status_color,
            font=("Segoe UI", 9, "bold")
        )
        subtitle.pack(anchor="w", pady=(3, 0))

        # --- Card 1: Load Activation Request ---
        req_card = ttk.Frame(main_frame, style="Card.TFrame", padding=15)
        req_card.pack(fill="x", pady=(0, 12))

        req_title = ttk.Label(req_card, text="۱. دریافت و بررسی فایل درخواست فعال‌سازی (.dbreq)", style="SubHeader.TLabel")
        req_title.pack(anchor="w", pady=(0, 8))

        btn_row = ttk.Frame(req_card, style="Card.TFrame")
        btn_row.pack(fill="x", pady=(0, 8))

        self.btn_load_req = ttk.Button(
            btn_row,
            text="📁 انتخاب فایل درخواست مشتری (.dbreq)...",
            style="Secondary.TButton",
            command=self.load_request_file
        )
        self.btn_load_req.pack(side="left")

        self.lbl_file_path = ttk.Label(btn_row, text="هیچ فایلی انتخاب نشده است", style="CardLabel.TLabel", foreground="#94a3b8")
        self.lbl_file_path.pack(side="left", padx=12)

        # Device Info Grid inside Card 1
        info_grid = ttk.Frame(req_card, style="Card.TFrame")
        info_grid.pack(fill="x", pady=4)

        ttk.Label(info_grid, text="نام کامپیوتر / کاربر:", style="CardLabel.TLabel", width=22).grid(row=0, column=0, sticky="w", pady=2)
        self.lbl_comp_name = ttk.Label(info_grid, text="—", style="CardLabel.TLabel", foreground="#38bdf8")
        self.lbl_comp_name.grid(row=0, column=1, sticky="w", pady=2)

        ttk.Label(info_grid, text="سیستم‌عامل:", style="CardLabel.TLabel").grid(row=1, column=0, sticky="w", pady=2)
        self.lbl_os = ttk.Label(info_grid, text="—", style="CardLabel.TLabel")
        self.lbl_os.grid(row=1, column=1, sticky="w", pady=2)

        ttk.Label(info_grid, text="مدل پردازنده (CPU):", style="CardLabel.TLabel").grid(row=2, column=0, sticky="w", pady=2)
        self.lbl_cpu = ttk.Label(info_grid, text="—", style="CardLabel.TLabel")
        self.lbl_cpu.grid(row=2, column=1, sticky="w", pady=2)

        ttk.Label(info_grid, text="اثر انگشت سخت‌افزار:", style="CardLabel.TLabel").grid(row=3, column=0, sticky="w", pady=2)
        self.lbl_fingerprint = ttk.Label(info_grid, text="—", style="CardLabel.TLabel", font=("Consolas", 8), foreground="#cbd5e1")
        self.lbl_fingerprint.grid(row=3, column=1, sticky="w", pady=2)

        ttk.Label(info_grid, text="وضعیت اعتبارسنجی:", style="CardLabel.TLabel").grid(row=4, column=0, sticky="w", pady=2)
        self.lbl_req_status = ttk.Label(info_grid, text="در انتظار فایل درخواست...", style="CardLabel.TLabel", foreground="#94a3b8")
        self.lbl_req_status.grid(row=4, column=1, sticky="w", pady=2)

        # --- Card 2: Customer License Configuration ---
        lic_card = ttk.Frame(main_frame, style="Card.TFrame", padding=15)
        lic_card.pack(fill="x", pady=(0, 12))

        lic_title = ttk.Label(lic_card, text="۲. مشخصات لایسنس دائمی مشتری", style="SubHeader.TLabel")
        lic_title.pack(anchor="w", pady=(0, 10))

        cust_row = ttk.Frame(lic_card, style="Card.TFrame")
        cust_row.pack(fill="x", pady=4)

        ttk.Label(cust_row, text="نام خریدار یا برچسب سیستم:", style="CardLabel.TLabel", width=22).pack(side="left")
        self.entry_customer = tk.Entry(
            cust_row,
            bg="#0f172a",
            fg="#ffffff",
            insertbackground="#ffffff",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#475569",
            highlightcolor="#099767",
            font=("Segoe UI", 10),
            width=40
        )
        self.entry_customer.pack(side="left", fill="x", expand=True)
        self.entry_customer.insert(0, "مشتری گرامی")

        # License Type & Policy Info
        policy_row = ttk.Frame(lic_card, style="Card.TFrame")
        policy_row.pack(fill="x", pady=(8, 0))

        policy_text = (
            "• نوع لایسنس: دائمی، بدون انقضا، قابل استفاده برای تمامی کاربران این کامپیوتر\n"
            "• اتصال به سخت‌افزار: قفل شده با کلید اختصاصی دستگاه و اثر انگشت سخت‌افزاری\n"
            "• دسترسی آفلاین: ۱۰۰٪ بدون نیاز به اینترنت، سرور یا اشتراک دوره‌ای"
        )
        lbl_policy = ttk.Label(policy_row, text=policy_text, style="CardLabel.TLabel", foreground="#94a3b8", justify="left")
        lbl_policy.pack(anchor="w")

        # --- Card 3: Action Buttons & Generation ---
        action_frame = ttk.Frame(main_frame)
        action_frame.pack(fill="x", pady=(10, 0))

        self.btn_generate = ttk.Button(
            action_frame,
            text="✨ صدور و ذخیره فایل لایسنس امضاشده (.dblic)",
            style="Accent.TButton",
            command=self.generate_and_save_license
        )
        self.btn_generate.pack(fill="x", ipady=4)

        # Output / Log Message Box
        self.lbl_result = ttk.Label(
            main_frame,
            text="راهنما: فایل درخواست (.dbreq) ارسال‌شده توسط مشتری را انتخاب نمایید، سپس دکمه صدور لایسنس را بزنید.",
            foreground="#94a3b8",
            wraplength=660,
            justify="center"
        )
        self.lbl_result.pack(pady=(12, 0))

    def load_request_file(self):
        file_path = filedialog.askopenfilename(
            title="انتخاب فایل درخواست فعال‌سازی",
            filetypes=[("Dubbing-Gholam Request", "*.dbreq"), ("JSON files", "*.json"), ("All Files", "*.*")]
        )
        if not file_path:
            return

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            res = verify_activation_request(data)
            if not res["valid"]:
                messagebox.showerror("خطا در درخواست", f"فایل درخواست معتبر نیست:\n{res['error']}")
                self.lbl_req_status.config(text=f"❌ نامعتبر: {res['error']}", foreground="#f87171")
                return

            self.current_req_data = res["details"]
            self.current_req_path = file_path

            self.lbl_file_path.config(text=os.path.basename(file_path), foreground="#38bdf8")
            self.lbl_comp_name.config(text=self.current_req_data.get("computerName", "—"))
            self.lbl_os.config(text=self.current_req_data.get("osName", "—"))
            self.lbl_cpu.config(text=self.current_req_data.get("cpuModel", "—"))
            self.lbl_fingerprint.config(text=self.current_req_data.get("hardwareFingerprint", "—"))
            self.lbl_req_status.config(text="✓ امضای دیجیتال دستگاه مشتری تایید شد (معتبر)", foreground="#34d399")

            # Suggest customer name if empty or default
            suggested = self.current_req_data.get("computerName", "Customer")
            self.entry_customer.delete(0, tk.END)
            self.entry_customer.insert(0, suggested)

            self.lbl_result.config(
                text="فایل درخواست با موفقیت بارگذاری شد. نام مشتری را در صورت نیاز اصلاح کرده و روی صدور لایسنس کلیک نمایید.",
                foreground="#34d399"
            )

        except Exception as e:
            messagebox.showerror("خطا در باز کردن فایل", f"امکان خواندن فایل وجود ندارد:\n{str(e)}")

    def generate_and_save_license(self):
        if not self.current_req_data:
            messagebox.showwarning("درخواست یافت نشد", "لطفاً ابتدا فایل درخواست مشتری (.dbreq) را بارگذاری نمایید.")
            return

        customer_name = self.entry_customer.get().strip()
        if not customer_name:
            customer_name = "Valued Customer"

        # Prompt destination to save .dblic
        clean_name = "".join(c for c in customer_name if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
        default_filename = f"DubbingGholam_License_{clean_name}.dblic"

        save_path = filedialog.asksaveasfilename(
            title="ذخیره فایل لایسنس امضاشده",
            initialfile=default_filename,
            filetypes=[("Dubbing-Gholam License", "*.dblic"), ("JSON files", "*.json"), ("All Files", "*.*")]
        )
        if not save_path:
            return

        try:
            signed_lic = generate_signed_license(
                customer_name=customer_name,
                hardware_fingerprint=self.current_req_data["hardwareFingerprint"],
                device_public_key_pem=self.current_req_data["devicePublicKey"]
            )

            with open(save_path, "w", encoding="utf-8") as f:
                json.dump(signed_lic, f, indent=2, ensure_ascii=False)

            msg = (
                f"فایل لایسنس دائمی با موفقیت ایجاد و با کلید اصلی امضا شد!\n\n"
                f"مسیر ذخیره:\n{save_path}\n\n"
                f"اکنون می‌توانید این فایل را برای مشتری ارسال نمایید تا در برنامه وارد نماید."
            )
            messagebox.showinfo("صدور موفق لایسنس", msg)
            self.lbl_result.config(text=f"✓ لایسنس با موفقیت صادر شد: {os.path.basename(save_path)}", foreground="#34d399")

        except Exception as e:
            messagebox.showerror("خطا در صدور لایسنس", f"عملیات صدور با خطا مواجه شد:\n{str(e)}")

def main():
    root = tk.Tk()
    app = LicenseGeneratorApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
