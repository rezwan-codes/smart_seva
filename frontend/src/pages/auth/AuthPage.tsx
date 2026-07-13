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
  AlertCircle,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { authService } from "../../services/authService";

type Role = "user" | "technician" | "admin";
type Mode = "login" | "register";
type RegistrationStep = "basic" | "details" | "security";

const roleContent: Record<
  Role,
  {
    title: string;
    subtitle: string;
    dashboardPath: string;
    icon: typeof User;
    accent: string;
    demoEmail: string;
    demoPassword: string;
  }
> = {
  user: {
    title: "User",
    subtitle: "Submit complaints and track your digital queue token.",
    dashboardPath: "/dashboard",
    icon: User,
    accent: "bg-sky-600 hover:bg-sky-700",
    demoEmail: "citizen@smartutility.local",
    demoPassword: "password123",
  },
  technician: {
    title: "Technician",
    subtitle: "View assigned jobs, ETA, and emergency service requests.",
    dashboardPath: "/technician/dashboard",
    icon: Wrench,
    accent: "bg-emerald-600 hover:bg-emerald-700",
    demoEmail: "aminul@smartutility.local",
    demoPassword: "password123",
  },
  admin: {
    title: "Admin",
    subtitle: "Monitor complaints, technicians, alerts, and service performance.",
    dashboardPath: "/admin/dashboard",
    icon: Building2,
    accent: "bg-slate-950 hover:bg-slate-800",
    demoEmail: "admin@smartutility.local",
    demoPassword: "password123",
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

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  nid?: string;
  area?: string;
  skill?: string;
  experience?: string;
  password?: string;
  confirmPassword?: string;
}

interface FormTouched {
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  nid?: boolean;
  area?: boolean;
  skill?: boolean;
  experience?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "bg-slate-200" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score === 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score === 4) return { score, label: "Strong", color: "bg-sky-500" };
  return { score, label: "Excellent", color: "bg-emerald-500" };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^\+?[\d\s-]{10,}$/.test(phone);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const params = useParams();
  const role = normalizeRole(params.role);
  const mode = normalizeMode(params.mode);
  const content = roleContent[role];
  const RoleIcon = content.icon;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<FormTouched>({});
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>("basic");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nid: "",
    area: "",
    skill: "electricity",
    experience: "",
    password: "",
    confirmPassword: "",
  });

  const isRegister = mode === "register";

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  const errors: FormErrors = useMemo(() => {
    const errs: FormErrors = {};

    if (touched.name && isRegister && !formData.name.trim()) {
      errs.name = "Full name is required";
    }

    if (touched.email) {
      if (!formData.email.trim()) {
        errs.email = "Email is required";
      } else if (!validateEmail(formData.email)) {
        errs.email = "Please enter a valid email address";
      }
    }

    if (isRegister && touched.phone) {
      if (!formData.phone.trim()) {
        errs.phone = "Phone number is required";
      } else if (!validatePhone(formData.phone)) {
        errs.phone = "Please enter a valid phone number";
      }
    }

    if (isRegister && touched.nid && !formData.nid.trim()) {
      errs.nid = role === "user" ? "NID is required" : "Official ID is required";
    }

    if (isRegister && touched.area && !formData.area.trim()) {
      errs.area = "Service area is required";
    }

    if (isRegister && role === "technician" && touched.skill && !formData.skill) {
      errs.skill = "Please select a specialization";
    }

    if (isRegister && role === "technician" && touched.experience && !formData.experience.trim()) {
      errs.experience = "Experience is required";
    }

    if (touched.password) {
      if (!formData.password) {
        errs.password = "Password is required";
      } else if (formData.password.length < 6) {
        errs.password = "Password must be at least 6 characters";
      }
    }

    if (isRegister && touched.confirmPassword) {
      if (!formData.confirmPassword) {
        errs.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = "Passwords do not match";
      }
    }

    return errs;
  }, [touched, formData, isRegister, role]);

  const isStepValid = useCallback(
    (step: RegistrationStep): boolean => {
      if (!isRegister) return true;

      switch (step) {
        case "basic":
          return !!(
            formData.name.trim() &&
            formData.email.trim() &&
            validateEmail(formData.email)
          );
        case "details":
          if (role === "technician") {
            return !!(formData.phone.trim() && formData.nid.trim() && formData.area.trim());
          }
          return !!(formData.phone.trim() && formData.nid.trim() && formData.area.trim());
        case "security":
          return !!(
            formData.password &&
            formData.password.length >= 6 &&
            formData.confirmPassword &&
            formData.password === formData.confirmPassword
          );
        default:
          return false;
      }
    },
    [formData, isRegister, role]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setTouched((prev) => ({ ...prev, [name]: true }));
      setError("");
    },
    []
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
    },
    []
  );

  const handleNextStep = useCallback(() => {
    setTouched((prev) => ({ ...prev, ...getCurrentStepFields(registrationStep) }));
    if (isStepValid(registrationStep)) {
      const nextStep: RegistrationStep =
        registrationStep === "basic"
          ? "details"
          : registrationStep === "details"
            ? "security"
            : "security";
      setRegistrationStep(nextStep);
    }
  }, [registrationStep, isStepValid]);

  const handlePrevStep = useCallback(() => {
    const prevStep: RegistrationStep =
      registrationStep === "security"
        ? "details"
        : registrationStep === "details"
          ? "basic"
          : "basic";
    setRegistrationStep(prevStep);
  }, [registrationStep]);

  const handleDemoLogin = useCallback(async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await authService.login({
        email: content.demoEmail,
        password: content.demoPassword,
      });
      localStorage.setItem("role", roleToStorage[role]);
      navigate(content.dashboardPath);
    } catch (requestError) {
      const errorResponse = requestError as {
        response?: { data?: { message?: string } };
      };
      setError(
        errorResponse.response?.data?.message ??
          "Demo login failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [content, role, navigate]);

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const allTouched: FormTouched = {
      name: true,
      email: true,
      phone: true,
      nid: true,
      area: true,
      skill: true,
      experience: true,
      password: true,
      confirmPassword: true,
    };
    setTouched(allTouched);

    try {
      if (isRegister) {
        if (formData.password !== formData.confirmPassword) {
          setError("Password and confirm password do not match.");
          return;
        }

        await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: roleToStorage[role] as "citizen" | "technician" | "admin",
          skill: formData.skill as "water" | "gas" | "electricity",
          area: formData.area,
        });
      } else {
        await authService.login({
          email: formData.email,
          password: formData.password,
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
          "Could not connect to the backend. Please make sure the API is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const registrationSteps: { key: RegistrationStep; label: string; description: string }[] = [
    { key: "basic", label: "Account", description: "Basic information" },
    { key: "details", label: "Details", description: "Contact & location" },
    { key: "security", label: "Security", description: "Password setup" },
  ];

  const currentStepIndex = registrationSteps.findIndex((s) => s.key === registrationStep);

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

            {isRegister && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  {registrationSteps.map((step, index) => (
                    <div key={step.key} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                            index <= currentStepIndex
                              ? "border-sky-400 bg-sky-500 text-white"
                              : "border-slate-600 bg-slate-800 text-slate-400"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-300">{step.label}</p>
                      </div>
                      {index < registrationSteps.length - 1 && (
                        <div className="mx-2 h-0.5 flex-1 bg-slate-700">
                          <div
                            className={`h-full transition-all duration-300 ${
                              index < currentStepIndex ? "bg-sky-400" : "bg-slate-700"
                            }`}
                            style={{
                              width: index < currentStepIndex ? "100%" : "0%",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {!isRegister && (
              <div className="mt-8 rounded-lg border border-sky-400/30 bg-sky-500/10 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Zap size={18} className="text-sky-300" />
                  <p className="text-sm font-semibold text-sky-100">Quick Demo Login</p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isSubmitting}
                  className="w-full rounded-md bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Logging in..." : `Login as ${content.title}`}
                </button>
                <p className="mt-2 text-xs text-slate-300">
                  Demo: {content.demoEmail}
                </p>
              </div>
            )}
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
                {isRegister && (
                  <p className="mt-1 text-sm text-slate-600">
                    Step {currentStepIndex + 1} of {registrationSteps.length}:{" "}
                    {registrationSteps[currentStepIndex]?.description}
                  </p>
                )}
              </div>
              <Link
                to={`/${role}/${isRegister ? "login" : "register"}`}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                {isRegister ? "Already registered?" : "Need an account?"}
              </Link>
            </div>

            <form onSubmit={submitForm} className="grid gap-4">
              {isRegister && registrationStep === "basic" && (
                <>
                  <div className="relative">
                    <label
                      className={`block text-sm font-semibold transition-colors ${
                        touched.name && errors.name
                          ? "text-red-700"
                          : touched.name && !errors.name
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      Full Name
                    </label>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.name && errors.name
                          ? "border-red-400 validation-error"
                          : touched.name && !errors.name
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <User className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder={role === "technician" ? "Technician name" : "Your name"}
                        className="w-full rounded-md p-3 outline-none"
                      />
                      {touched.name && !errors.name && formData.name && (
                        <CheckCircle2 className="mr-3 mt-3 text-emerald-500" size={20} />
                      )}
                      {touched.name && errors.name && (
                        <AlertCircle className="mr-3 mt-3 text-red-500" size={20} />
                      )}
                    </div>
                    {touched.name && errors.name && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 animate-slide-down">
                        <XCircle size={14} />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <label
                      className={`block text-sm font-semibold transition-colors ${
                        touched.email && errors.email
                          ? "text-red-700"
                          : touched.email && !errors.email
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      Email Address
                    </label>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.email && errors.email
                          ? "border-red-400 validation-error"
                          : touched.email && !errors.email
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <Mail className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="email"
                        required
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="name@example.com"
                        className="w-full rounded-md p-3 outline-none"
                      />
                      {touched.email && !errors.email && formData.email && (
                        <CheckCircle2 className="mr-3 mt-3 text-emerald-500" size={20} />
                      )}
                      {touched.email && errors.email && (
                        <AlertCircle className="mr-3 mt-3 text-red-500" size={20} />
                      )}
                    </div>
                    {touched.email && errors.email && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 animate-slide-down">
                        <XCircle size={14} />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!isStepValid("basic")}
                    className="flex items-center justify-center gap-2 rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ArrowLeft size={18} className="rotate-180" />
                  </button>
                </>
              )}

              {isRegister && registrationStep === "details" && (
                <>
                  <div className="relative">
                    <label
                      className={`block text-sm font-semibold transition-colors ${
                        touched.phone && errors.phone
                          ? "text-red-700"
                          : touched.phone && !errors.phone
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      Phone Number
                    </label>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.phone && errors.phone
                          ? "border-red-400 validation-error"
                          : touched.phone && !errors.phone
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <Phone className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="+880 17XX-XXXXXX"
                        className="w-full rounded-md p-3 outline-none"
                      />
                      {touched.phone && !errors.phone && formData.phone && (
                        <CheckCircle2 className="mr-3 mt-3 text-emerald-500" size={20} />
                      )}
                      {touched.phone && errors.phone && (
                        <AlertCircle className="mr-3 mt-3 text-red-500" size={20} />
                      )}
                    </div>
                    {touched.phone && errors.phone && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 animate-slide-down">
                        <XCircle size={14} />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <label
                      className={`block text-sm font-semibold transition-colors ${
                        touched.nid && errors.nid
                          ? "text-red-700"
                          : touched.nid && !errors.nid
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      {role === "technician" ? "Technician ID" : role === "admin" ? "Authority ID" : "NID"}
                    </label>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.nid && errors.nid
                          ? "border-red-400 validation-error"
                          : touched.nid && !errors.nid
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <IdCard className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="nid"
                        required
                        value={formData.nid}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder={role === "user" ? "National ID" : "Official ID"}
                        className="w-full rounded-md p-3 outline-none"
                      />
                      {touched.nid && !errors.nid && formData.nid && (
                        <CheckCircle2 className="mr-3 mt-3 text-emerald-500" size={20} />
                      )}
                      {touched.nid && errors.nid && (
                        <AlertCircle className="mr-3 mt-3 text-red-500" size={20} />
                      )}
                    </div>
                    {touched.nid && errors.nid && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 animate-slide-down">
                        <XCircle size={14} />
                        {errors.nid}
                      </p>
                    )}
                  </div>

                  {role === "technician" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="relative">
                        <label
                          className={`block text-sm font-semibold transition-colors ${
                            touched.skill && errors.skill
                              ? "text-red-700"
                              : "text-slate-700"
                          }`}
                        >
                          Specialization
                        </label>
                        <select
                          name="skill"
                          required
                          value={formData.skill}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className="mt-2 w-full rounded-md border-2 border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
                        >
                          <option value="electricity">Electricity</option>
                          <option value="water">Water</option>
                          <option value="gas">Gas</option>
                        </select>
                      </div>

                      <div className="relative">
                        <label
                          className={`block text-sm font-semibold transition-colors ${
                            touched.experience && errors.experience
                              ? "text-red-700"
                              : touched.experience && !errors.experience
                                ? "text-emerald-700"
                                : "text-slate-700"
                          }`}
                        >
                          Experience
                        </label>
                        <div
                          className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                            touched.experience && errors.experience
                              ? "border-red-400 validation-error"
                              : touched.experience && !errors.experience
                                ? "border-emerald-400 validation-success"
                                : "border-slate-300 focus-within:border-sky-500"
                          }`}
                        >
                          <BriefcaseBusiness className="ml-3 mt-3 text-slate-400" size={20} />
                          <input
                            name="experience"
                            required
                            value={formData.experience}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="3 years"
                            className="w-full rounded-md p-3 outline-none"
                          />
                          {touched.experience && !errors.experience && formData.experience && (
                            <CheckCircle2 className="mr-3 mt-3 text-emerald-500" size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <label
                      className={`block text-sm font-semibold transition-colors ${
                        touched.area && errors.area
                          ? "text-red-700"
                          : touched.area && !errors.area
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      Service Area
                    </label>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.area && errors.area
                          ? "border-red-400 validation-error"
                          : touched.area && !errors.area
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <MapPin className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="area"
                        required
                        value={formData.area}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Dhanmondi, Mirpur, Uttara"
                        className="w-full rounded-md p-3 outline-none"
                      />
                      {touched.area && !errors.area && formData.area && (
                        <CheckCircle2 className="mr-3 mt-3 text-emerald-500" size={20} />
                      )}
                      {touched.area && errors.area && (
                        <AlertCircle className="mr-3 mt-3 text-red-500" size={20} />
                      )}
                    </div>
                    {touched.area && errors.area && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 animate-slide-down">
                        <XCircle size={14} />
                        {errors.area}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex items-center justify-center gap-2 rounded-md border-2 border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <ArrowLeft size={18} />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={!isStepValid("details")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ArrowLeft size={18} className="rotate-180" />
                    </button>
                  </div>
                </>
              )}

              {isRegister && registrationStep === "security" && (
                <>
                  <div className="relative">
                    <label
                      className={`block text-sm font-semibold transition-colors ${
                        touched.password && errors.password
                          ? "text-red-700"
                          : touched.password && !errors.password
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      Password
                    </label>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.password && errors.password
                          ? "border-red-400 validation-error"
                          : touched.password && !errors.password
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <Lock className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="password"
                        required
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Create a strong password"
                        className="w-full rounded-md p-3 outline-none"
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
                    {formData.password && (
                      <div className="mt-2 animate-scale-in">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex-1 rounded-full bg-slate-200 h-2 overflow-hidden">
                            <div
                              className={`password-strength-bar h-full rounded-full ${passwordStrength.color}`}
                              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            />
                          </div>
                          <span className="ml-3 text-xs font-semibold text-slate-600">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-500">
                          <span className={formData.password.length >= 8 ? "text-emerald-600 font-semibold" : ""}>
                            • Length
                          </span>
                          <span className={/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) ? "text-emerald-600 font-semibold" : ""}>
                            • Mixed case
                          </span>
                          <span className={/\d/.test(formData.password) ? "text-emerald-600 font-semibold" : ""}>
                            • Numbers
                          </span>
                          <span className={/[^a-zA-Z0-9]/.test(formData.password) ? "text-emerald-600 font-semibold" : ""}>
                            • Symbols
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label
                      className={`block text-sm font-semibold transition-colors ${
                        touched.confirmPassword && errors.confirmPassword
                          ? "text-red-700"
                          : touched.confirmPassword && !errors.confirmPassword
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      Confirm Password
                    </label>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.confirmPassword && errors.confirmPassword
                          ? "border-red-400 validation-error"
                          : touched.confirmPassword && !errors.confirmPassword
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <ShieldCheck className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="confirmPassword"
                        required
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Confirm your password"
                        className="w-full rounded-md p-3 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="px-3 text-slate-500 transition hover:text-slate-800"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 animate-slide-down">
                        <XCircle size={14} />
                        {errors.confirmPassword}
                      </p>
                    )}
                    {touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-emerald-600 animate-slide-down">
                        <CheckCircle2 size={14} />
                        Passwords match
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex items-center justify-center gap-2 rounded-md border-2 border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <ArrowLeft size={18} />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !isStepValid("security")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-5 py-3 font-semibold text-white transition ${content.accent} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSubmitting ? (
                        "Please wait..."
                      ) : (
                        <>
                          <UserPlus size={18} />
                          Complete Registration
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {!isRegister && (
                <>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Email Address</span>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.email && errors.email
                          ? "border-red-400 validation-error"
                          : touched.email && !errors.email
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <Mail className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="email"
                        required
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        defaultValue={content.demoEmail}
                        placeholder="name@example.com"
                        className="w-full rounded-md p-3 outline-none"
                      />
                      {touched.email && !errors.email && formData.email && (
                        <CheckCircle2 className="mr-3 mt-3 text-emerald-500" size={20} />
                      )}
                    </div>
                    {touched.email && errors.email && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 animate-slide-down">
                        <XCircle size={14} />
                        {errors.email}
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Password</span>
                    <div
                      className={`mt-2 flex rounded-md border-2 bg-white transition-all ${
                        touched.password && errors.password
                          ? "border-red-400 validation-error"
                          : touched.password && !errors.password
                            ? "border-emerald-400 validation-success"
                            : "border-slate-300 focus-within:border-sky-500"
                      }`}
                    >
                      <Lock className="ml-3 mt-3 text-slate-400" size={20} />
                      <input
                        name="password"
                        required
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        defaultValue={content.demoPassword}
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

                  {error && (
                    <div className="animate-scale-in rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`mt-2 flex items-center justify-center gap-2 rounded-md px-5 py-3 font-semibold text-white transition ${content.accent} disabled:opacity-50`}
                  >
                    {isSubmitting ? (
                      "Signing in..."
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Sign in as {content.title}
                      </>
                    )}
                  </button>
                </>
              )}

              {isRegister && (
                <>
                  {error && (
                    <div className="animate-scale-in rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}
                  {!isSubmitting && !error && Object.keys(errors).length > 0 && (
                    <div className="rounded-md bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                      Please fix the errors above before continuing.
                    </div>
                  )}
                </>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function getCurrentStepFields(step: RegistrationStep): FormTouched {
  switch (step) {
    case "basic":
      return { name: true, email: true };
    case "details":
      return { phone: true, nid: true, area: true, skill: true, experience: true };
    case "security":
      return { password: true, confirmPassword: true };
    default:
      return {};
  }
}
