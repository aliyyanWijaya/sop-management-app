import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock next/navigation & next/cache sebelum import actions ---
// redirect() di Next.js sebenarnya "throw" secara internal untuk
// menghentikan render — kita tiru perilaku itu di mock supaya kode
// setelah redirect() di dalam action tidak ikut jalan saat ditest.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const revalidatePathMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

// --- Mock Supabase server client ---
const signUpMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
    },
  })),
}));

// Import HARUS setelah vi.mock di atas (hoisting vitest menjamin urutan ini aman)
import { signup, login, logout } from "./actions";

function buildFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signup", () => {
  it("memanggil supabase.auth.signUp dengan data & metadata yang benar", async () => {
    signUpMock.mockResolvedValue({ error: null });
    const formData = buildFormData({
      email: "user@test.com",
      password: "rahasia123",
      name: "Budi",
      department_id: "dept-uuid-1",
    });

    await expect(signup(formData)).rejects.toThrow(
      `REDIRECT:/login?message=${encodeURIComponent("Check your email to confirm your account")}`,
    );

    expect(signUpMock).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "rahasia123",
      options: {
        data: { name: "Budi", department_id: "dept-uuid-1" },
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("redirect balik ke /signup dengan pesan error kalau signUp gagal", async () => {
    signUpMock.mockResolvedValue({
      error: { message: "Email sudah terdaftar" },
    });
    const formData = buildFormData({
      email: "dup@test.com",
      password: "rahasia123",
      name: "Budi",
      department_id: "dept-uuid-1",
    });

    await expect(signup(formData)).rejects.toThrow(
      `REDIRECT:/signup?error=${encodeURIComponent("Email sudah terdaftar")}`,
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  it("redirect ke /sop kalau login berhasil", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    const formData = buildFormData({
      email: "user@test.com",
      password: "rahasia123",
    });

    await expect(login(formData)).rejects.toThrow("REDIRECT:/sop");

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "rahasia123",
    });
  });

  it("redirect balik ke /login dengan pesan error kalau kredensial salah", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { message: "Email atau password salah" },
    });
    const formData = buildFormData({
      email: "user@test.com",
      password: "salah",
    });

    await expect(login(formData)).rejects.toThrow(
      `REDIRECT:/login?error=${encodeURIComponent("Email atau password salah")}`,
    );
  });
});

describe("logout", () => {
  it("memanggil signOut lalu redirect ke /login", async () => {
    signOutMock.mockResolvedValue({ error: null });

    await expect(logout()).rejects.toThrow("REDIRECT:/login");

    expect(signOutMock).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });
});
