
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LogOut, UserCircle, ShieldAlert } from 'lucide-react';

interface MockUser {
  id: string;
  fullName: string;
  username: string;
  primaryEmailAddress: { emailAddress: string };
}

interface AuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: MockUser | null;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MockAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<MockUser | null>(null);

  const signIn = () => {
    setIsSignedIn(true);
    setUser({
      id: 'user_mock_12345',
      fullName: 'Dr. Jean Expert',
      username: 'j.expert',
      primaryEmailAddress: { emailAddress: 'jean.expert@pro.fr' }
    });
  };

  const signOut = () => {
    setIsSignedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isSignedIn, isLoaded: true, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useUser must be used within MockAuthProvider');
  return { isLoaded: context.isLoaded, isSignedIn: context.isSignedIn, user: context.user };
};

export const SignedIn: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useUser();
  return isSignedIn ? <>{children}</> : null;
};

export const SignedOut: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useUser();
  return !isSignedIn ? <>{children}</> : null;
};

export const SignIn: React.FC<any> = () => {
  const { signIn } = useContext(AuthContext)!;
  return (
    <div className="w-full space-y-6">
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-4 flex gap-3 items-start">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed font-medium">
          <strong>Note :</strong> L'authentification Clerk a été remplacée par un mode démo local car votre clé publique Clerk rejette l'URL de prévisualisation.
        </p>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Espace Praticien</h2>
        <p className="text-sm text-slate-500 font-medium">Connectez-vous pour gérer vos recouvrements</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identifiant (Démo)</label>
          <input 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium" 
            placeholder="nom@exemple.fr" 
            defaultValue="jean.expert@pro.fr" 
            readOnly
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mot de passe</label>
          <input 
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium" 
            type="password" 
            defaultValue="••••••••"
            readOnly
          />
        </div>
        <button 
          onClick={signIn}
          className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 h-12 px-4 py-2 w-full shadow-lg shadow-indigo-100 active:scale-95"
        >
          Se connecter (Session Démo)
        </button>
      </div>
    </div>
  );
};

export const SignUp: React.FC<any> = () => <SignIn />;

export const UserButton: React.FC = () => {
  const { signOut, user } = useContext(AuthContext)!;
  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={signOut}
        className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-800 rounded-lg"
        title="Déconnexion"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
};
