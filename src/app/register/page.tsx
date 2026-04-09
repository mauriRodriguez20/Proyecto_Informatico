import AuthContainer from "@/components/auth/AuthContainer";

export default function RegisterPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <AuthContainer initialMode="register" />
        </div>
    );
}
