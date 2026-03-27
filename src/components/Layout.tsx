import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Shield,
  Sparkles,
  CreditCard,
  Package,
  Activity,
} from 'lucide-react';

const Page = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Sidebar = styled.aside`
  width: 260px;
  background: ${({ theme }) => theme.colors.sidebar};
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
`;

const Logo = styled.div`
  padding: 1.5rem 1.25rem;
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
`;

const Nav = styled.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  color: #94a3b8;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.sidebarHover};
    color: #e2e8f0;
  }

  &.active {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }
`;

const UserBlock = styled.div`
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UserEmail = styled.span`
  font-size: 0.8125rem;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LogoutBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: #94a3b8;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }
`;

const Main = styled.main`
  flex: 1;
  overflow: auto;
  padding: 1.5rem 2rem;
`;

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Page>
      <Sidebar>
        <Logo>
          <Shield size={28} />
          MyOffers Admin
        </Logo>
        <Nav>
          <NavItem to="/" end>
            <LayoutDashboard size={20} />
            לוח בקרה
          </NavItem>
          <NavItem to="/logs">
            <FileText size={20} />
            לוגים
          </NavItem>
          <NavItem to="/users">
            <Users size={20} />
            משתמשים
          </NavItem>
          <NavItem to="/prompts">
            <Sparkles size={20} />
            פרומפטים AI
          </NavItem>
          <NavItem to="/subscriptions">
            <CreditCard size={20} />
            מנויים
          </NavItem>
          <NavItem to="/plans">
            <Package size={20} />
            חבילות
          </NavItem>
          <NavItem to="/ai-usage">
            <Activity size={20} />
            מכסות AI
          </NavItem>
        </Nav>
        <UserBlock>
          <UserEmail title={user?.email ?? ''}>{user?.email ?? ''}</UserEmail>
          <LogoutBtn type="button" onClick={handleLogout}>
            <LogOut size={18} />
            התנתק
          </LogoutBtn>
        </UserBlock>
      </Sidebar>
      <Main>
        <Outlet />
      </Main>
    </Page>
  );
}
