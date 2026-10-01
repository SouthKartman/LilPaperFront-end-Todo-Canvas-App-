import { Logo } from "@shared/ui/icons/Logo/Logo"
import styles from "./Header.module.css";

export const Header: React.FC = () => {
    return (
        <div className={styles.HeaderLogo}>
            <Logo></Logo>
        </div>
    )
}