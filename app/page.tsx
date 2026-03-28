import { redirect } from "next/navigation"
import { routing } from "@/i18n/routing"

// This page is reached if the middleware doesn't rewrite the root path to a locale.
// We redirect to the default locale as a fallback to ensure the user always sees a valid page.
export default function RootPage() {
    redirect(`/${routing.defaultLocale}`)
}
