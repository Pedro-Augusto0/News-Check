export function AppLogo() {
  return (
    <svg
      className="app-header__logo"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="22"
        height="22"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3.5 2.5"
      />
      <path
        d="M9 8.5h10a1.5 1.5 0 0 1 1.5 1.5v11l-6.5-4-6.5 4v-11A1.5 1.5 0 0 1 9 8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="13.5" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M14 10.75v1.5M14 14.75v1.5M11.75 13.5h1.5M14.75 13.5h1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}
