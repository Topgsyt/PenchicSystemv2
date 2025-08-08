import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import DiscountsOffers from './pages/admin/DiscountsOffers';
import StockManagement from './pages/admin/StockManagement';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import UserManagement from './pages/admin/UserManagement';
import Settings from './pages/admin/Settings';
import POSInterface from './pages/pos/POSInterface';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Payment from './pages/Payment';

import { useStore } from './store';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const setUser = useStore((state) => state.setUser);
  const user = useStore((state) => state.user);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchOrCreateProfile(session.user.id, session.user.email!);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchOrCreateProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  const fetchOrCreateProfile = async (userId: string, email: string) => {
    try {
      // First try to fetch existing profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        throw fetchError;
      }

      if (profile) {
        // Profile exists, update user state
        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
        });
      } else {
        // Double check for race conditions before creating new profile
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', userId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking for existing profile:', checkError);
          throw checkError;
        }

        if (existingProfile) {
          // Profile was created between our checks, use it
          setUser({
            id: existingProfile.id,
            email: existingProfile.email,
            role: existingProfile.role,
          });
        } else {
          // Profile still doesn't exist, safe to create new one
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userId,
                email: email,
                // Default role is set by the table definition
              }
            ])
            .select('id, email, role')
            .single();

          if (insertError) {
            // If we still get a duplicate key error, fetch the profile one last time
            if (insertError.code === '23505') {
              const { data: finalCheck, error: finalError } = await supabase
                .from('profiles')
                .select('id, email, role')
                .eq('id', userId)
                .single();

              if (finalError) {
                console.error('Error in final profile check:', finalError);
                throw finalError;
              }

              if (finalCheck) {
                setUser({
                  id: finalCheck.id,
                  email: finalCheck.email,
                  role: finalCheck.role,
                });
                return;
              }
            }
            console.error('Error creating profile:', insertError);
            throw insertError;
          }

          if (newProfile) {
            setUser({
              id: newProfile.id,
              email: newProfile.email,
              role: newProfile.role,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in profile management:', error);
      // Don't throw here - we want to gracefully handle errors
      // and not break the auth flow
    }
  };

  // Protected route component
  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    if (user.role !== 'admin') {
      return <Navigate to="/" />;
    }
    return <>{children}</>;
  };

  const WorkerRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    if (!['admin', 'worker'].includes(user.role)) {
      return <Navigate to="/" />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/mpesa" element={<Payment method="mpesa" />} />
            <Route path="/payment/cash" element={<Payment method="cash" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
            <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
            <Route path="/admin/discounts" element={<AdminRoute><DiscountsOffers /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AnalyticsDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />
            
            {/* Worker Routes */}
            <Route path="/admin/stock-management" element={<WorkerRoute><StockManagement /></WorkerRoute>} />
            <Route path="/pos" element={<WorkerRoute><POSInterface /></WorkerRoute>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;