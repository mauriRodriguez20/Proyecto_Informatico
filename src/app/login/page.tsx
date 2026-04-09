import AuthContainer from "@/components/auth/AuthContainer";

export default function LoginPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <AuthContainer initialMode="login" />
        </div>
    );
}
