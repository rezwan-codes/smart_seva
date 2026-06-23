import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Eye,
  EyeOff,
  IdCard,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { authService } from "../../services/authService";

type Role = "user" | "technician" | "admin";
type Mode = "login" | "register";

const roleContent: Record<
  Role,
  {
    title: string;
    subtitle: string;
    dashboardPath: string;
    icon: typeof User;
    accent: string;
    demoEmail: string;
  }
> = {
  user: {
    title: "User",
    subtitle: "Submit complaints and track your digital queue token.",
    dashboardPath: "/dashboard",
    icon: User,
    accent: "bg-sky-600 hover:bg-sky-700",
    demoEmail: "citizen@smartutility.local",
  },
  technician: {
    title: "Technician",
    subtitle: "View assigned jobs, ETA, and emergency service requests.",
    dashboardPath: "/technician/dashboard",
    icon: Wrench,
    accent: "bg-emerald-600 hover:bg-emerald-700",
    demoEmail: "aminul@smartutility.local",
  },
  admin: {
    title: "Admin",
    subtitle: "Monitor complaints, technicians, alerts, and service performance.",
    dashboardPath: "/admin/dashboard",
    icon: Building2,
    accent: "bg-slate-950 hover:bg-slate-800",
    demoEmail: "admin@smartutility.local",
  },
};

const roleToStorage: Record<Role, string> = {
  user: "citizen",
  technician: "technician",
  admin: "admin",
};

function normalizeRole(role?: string): Role {
  if (role === "technician" || role === "admin") {
    return role;
  }

  return "user";
}

function normalizeMode(mode?: string): Mode {
  return mode === "register" ? "register" : "login";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const params = useParams();
  const role = normalizeRole(params.role);
  const mode = normalizeMode(params.mode);
  const content = roleContent[role];
  const RoleIcon = content.icon;
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";
  const alternateMode: Mode = isRegister ? "login" : "register";

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      if (isRegister) {
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        if (password !== confirmPassword) {
          setError("Password and confirm password do not match.");
          return;
        }

        await authService.register({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password,
          phone: String(formData.get("phone") ?? ""),
          role: roleToStorage[role] as "citizen" | "technician" | "admin",
          skill: String(formData.get("skill") ?? "electricity").toLowerCase() as
            | "water"
            | "gas"
            | "electricity",
          area: String(formData.get("area") ?? ""),
        });
      } else {
        await authService.login({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        });
      }

      localStorage.setItem("role", roleToStorage[role]);
      navigate(content.dashboardPath);
    } catch (requestError) {
      const errorResponse = requestError as {
        response?: { data?: { message?: string } };
      };

      setError(
        errorResponse.response?.data?.message ??
          "Could not connect to the backend. Please make sure the API is running.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-slate-700 transition hover:bg-white"
        >
          <ArrowLeft size={18} />
          Home
        </Link>

        <section className="grid overflow-hidden rounded-lg bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-slate-950">
              <RoleIcon size={24} />
            </div>
            <h1 className="mt-6 text-3xl font-bold">
              {content.title} {isRegister ? "Registration" : "Login"}
            </h1>
            <p className="mt-3 leading-7 text-slate-300">{content.subtitle}</p>

            <div className="mt-8 space-y-3">
              {[
                ["Digital token", "Automatic serial number after complaint submission."],
                ["Live status", "Pending, processing, and completed updates."],
                ["Fast response", "Nearest technician assignment and ETA tracking."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-md border border-white/10 bg-white/10 p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-slate-300">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                  {content.title} access
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {isRegister ? "Create your account" : "Sign in to continue"}
                </h2>
              </div>
              <Link
                to={`/${role}/${alternateMode}`}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                {isRegister ? "Already registered?" : "Need an account?"}
              </Link>
            </div>

            <form onSubmit={submitForm} className="grid gap-4">
              {isRegister && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Full Name</span>
                  <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                    <User className="ml-3 mt-3 text-slate-400" size={20} />
                    <input
                      name="name"
                      required
                      placeholder={role === "technician" ? "Technician name" : "Your name"}
                      className="w-full rounded-md p-3 outline-none"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email Address</span>
                <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                  <Mail className="ml-3 mt-3 text-slate-400" size={20} />
                  <input
                    name="email"
                    required
                    type="email"
                    defaultValue={!isRegister ? content.demoEmail : ""}
                    placeholder="name@example.com"
                    className="w-full rounded-md p-3 outline-none"
                  />
                </div>
              </label>

              {isRegister && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Phone Number</span>
                    <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                      <Phone className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="phone"
                        required
                        placeholder="+880 17XX-XXXXXX"
                        className="w-full rounded-md p-3 outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      {role === "technician" ? "Technician ID" : role === "admin" ? "Authority ID" : "NID"}
                    </span>
                    <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                      <IdCard className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        required
                        placeholder={role === "user" ? "National ID" : "Official ID"}
                        className="w-full rounded-md p-3 outline-none"
                      />
                    </div>
                  </label>
                </div>
              )}

              {isRegister && role === "technician" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Specialization</span>
                    <select
                      name="skill"
                      required
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
                    >
                      <option>Electricity</option>
                      <option>Water</option>
                      <option>Gas</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Experience</span>
                    <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                      <BriefcaseBusiness className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        required
                        placeholder="3 years"
                        className="w-full rounded-md p-3 outline-none"
                      />
                    </div>
                  </label>
                </div>
              )}

              {isRegister && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Service Area</span>
                  <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                    <MapPin className="ml-3 mt-3 text-slate-400" size={20} />
                    <input
                      name="area"
                      required
                      placeholder="Dhanmondi, Mirpur, Uttara"
                      className="w-full rounded-md p-3 outline-none"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                  <Lock className="ml-3 mt-3 text-slate-400" size={20} />
                  <input
                    name="password"
                    required
                    type={showPassword ? "text" : "password"}
                    defaultValue={!isRegister ? "password123" : ""}
                    placeholder="Enter password"
                    className="w-full p-3 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="px-3 text-slate-500 transition hover:text-slate-800"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>

              {isRegister && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Confirm Password</span>
                  <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                    <ShieldCheck className="ml-3 mt-3 text-slate-400" size={20} />
                    <input
                      name="confirmPassword"
                      required
                      type="password"
                      placeholder="Confirm password"
                      className="w-full rounded-md p-3 outline-none"
                    />
                  </div>
                </label>
              )}

              {error && (
                <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`mt-2 flex items-center justify-center gap-2 rounded-md px-5 py-3 font-semibold text-white transition ${content.accent}`}
              >
                {isRegister ? <UserPlus size={18} /> : <ShieldCheck size={18} />}
                {isSubmitting
                  ? "Please wait..."
                  : isRegister
                    ? `Register as ${content.title}`
                    : `Login as ${content.title}`}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
