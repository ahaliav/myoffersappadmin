import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { authApi, toAuthError } from '../api/authApi';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { googleSignInEnabled } from '../lib/googleConfig';
import { Shield } from 'lucide-react';

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
`;

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 2.5rem;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  color: #0f172a;
  font-size: 1.5rem;
  font-weight: 700;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
`;

const Subtitle = styled.p`
  margin: 0 0 1.75rem 0;
  font-size: 0.9375rem;
  color: #64748b;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9375rem;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.25rem;
  transition: opacity 0.2s, transform 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.95;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Error = styled.div`
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  border: 1px solid #fecaca;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.25rem 0;
  color: #94a3b8;
  font-size: 0.8125rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }
`;

const Notice = styled.div`
  background: #eff6ff;
  color: #1d4ed8;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  border: 1px solid #bfdbfe;
`;

const LinkBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: #2563eb;
  font-size: 0.875rem;
  cursor: pointer;
  align-self: flex-start;

  &:hover {
    text-decoration: underline;
  }
`;

const ERROR_TEXT: Record<string, string> = {
  invalid_credentials: 'אימייל או סיסמה שגויים',
  password_reset_required: 'לחשבון הזה אין עדיין סיסמה. שלחנו אליך מייל עם קישור לבחירת סיסמה.',
  account_disabled: 'החשבון מושבת',
  not_admin: 'לחשבון הזה אין הרשאת ניהול',
  too_many_requests: 'יותר מדי ניסיונות. נסו שוב בעוד דקה.',
  invalid_google_token: 'ההתחברות עם Google נכשלה',
  google_not_configured: 'התחברות עם Google לא מוגדרת בשרת',
  auth_not_configured: 'ההתחברות לא זמינה כרגע',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const showError = (code: string, message: string) => {
    if (code === 'password_reset_required') {
      setNotice(ERROR_TEXT[code]);
      return;
    }
    setError(ERROR_TEXT[code] ?? message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    if (forgot) {
      try {
        await authApi.forgotPassword(email.trim());
        setNotice('אם קיים חשבון עם המייל הזה, נשלח אליו קישור לבחירת סיסמה חדשה.');
      } catch (err) {
        const info = toAuthError(err);
        showError(info.code, info.message);
      }
      setLoading(false);
      return;
    }
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      showError(err.code, err.message);
      return;
    }
    navigate('/', { replace: true });
  };

  const handleGoogle = async (idToken: string) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    const { error: err } = await signInWithGoogle(idToken);
    setLoading(false);
    if (err) {
      showError(err.code, err.message);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <Page>
      <Card>
        <Logo>
          <Shield size={32} />
          TooDay Admin
        </Logo>
        <Title>ממשק ניהול</Title>
        <Subtitle>{forgot ? 'נשלח לך קישור לבחירת סיסמה חדשה' : 'התחבר עם חשבון TooDay'}</Subtitle>
        <Form onSubmit={handleSubmit}>
          {error && <Error>{error}</Error>}
          {notice && <Notice>{notice}</Notice>}
          <div>
            <Label>אימייל</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>
          {!forgot && (
            <div>
              <Label>סיסמה</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? (forgot ? 'שולח...' : 'מתחבר...') : forgot ? 'שלח קישור' : 'התחבר'}
          </Button>
          <LinkBtn
            type="button"
            onClick={() => {
              setForgot(!forgot);
              setError(null);
              setNotice(null);
            }}
          >
            {forgot ? 'חזרה להתחברות' : 'שכחתי סיסמה'}
          </LinkBtn>
        </Form>
        {googleSignInEnabled && !forgot && (
          <>
            <Divider>או</Divider>
            <GoogleSignInButton onCredential={handleGoogle} onError={setError} disabled={loading} />
          </>
        )}
      </Card>
    </Page>
  );
}
