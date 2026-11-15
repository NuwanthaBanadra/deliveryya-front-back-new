import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import ScrollToTop from './ScrollToTop'
import AdvancePanel from './advance_panel/AdvancePanel'
import AccessManagement from './advance_panel/comps/AccessManagement'
import MarketsDirectory from './advance_panel/comps/MarketsDirectory'
import MarketWorkspace from './advance_panel/comps/markets/MarketWorkspace'
import MyMarket from './advance_panel/comps/MyMarket'
import OrderCodeRequests from './advance_panel/comps/OrderCodeRequests'
import AccessCatalog from './advance_panel/comps/access_management/AccessCatalog'
import UserAccessControl from './advance_panel/comps/access_management/UserAccessControl'
import UserRolesPermissions from './advance_panel/comps/access_management/UserRolesPermissions'
import Career from './advance_panel/comps/career/Career'
import MarketsCategoriesBrandsPage from './advance_panel/comps/markets/MarketsCategoriesBrandsPage'
import AddProduct from './advance_panel/comps/my_market/AddProduct'
import ProductsManager from './advance_panel/comps/my_market/ProductsManager'
import ReceivingOrders from './advance_panel/comps/orders/ReceivingOrders'
import ProfilePanel from './advance_panel/comps/profile/ProfilePanel'
import RequestForMarket from './advance_panel/comps/profile/RequestForMarket'
import UserRequestsManager from './advance_panel/comps/profile/UserRequestsManager'
import MyRequestsManager from './advance_panel/comps/profile/MyRequestsManager'

import AddOrders from './deliveryya_dashboard/comps/AddOrders'
import Dashboard from './deliveryya_dashboard/comps/Dashborad'
import PlacedOrders from './deliveryya_dashboard/comps/PlacedOrders'
import SingleProductView from './page_comps/allProducts/SingleProductView'
import About from './pages/About'
import AllMarketsP from './pages/AllMarketsP'
import AllProductsP from './pages/AllProductsP'
import Forbidden from './pages/Forbidden'
import Home from './pages/Home'
import MarketProfile from './pages/MarketProfile'
import ResetPassword from './pages/ResetPassword'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Store from './pages/Store'
import VerifyDocuments from './pages/VerifyDocuments'
import VerifyEmail from './pages/VerifyEmail'

import { onMessage } from 'firebase/messaging'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import AdminUserStatusTable from './advance_panel/comps/admin_user/AdminUserStatusTable'
import ComplaintsManager from './advance_panel/comps/complaints/ComplaintsManager'
import MyComplaints from './advance_panel/comps/complaints/MyComplaints'
import CategoryBrandsManager from './advance_panel/comps/my_market/category_brands'
import Accounts from './deliveryya_dashboard/comps/Accounts'
import EmployeeAssignmentPanel from './deliveryya_dashboard/comps/EmployeeAssignmentPanel'
import OrderAnalytics from './deliveryya_dashboard/comps/OrderAnalytics'
import OrderCheckout from './deliveryya_dashboard/comps/OrderCheckout'
import UrgentJobs from './deliveryya_dashboard/comps/UrgentJobs'
import AgentPaymentHandover from './deliveryya_dashboard/comps/employeeAssignment/AgentPaymentHandover'
import OnHandOrders from './deliveryya_dashboard/comps/employeeAssignment/OnHandOrders'
import PickupRequestAssignments from './deliveryya_dashboard/comps/employeeAssignment/PickupRequestAssignments'
import PdfGenerator from './deliveryya_dashboard/comps/pdfGenaretor/PdfGenerator'
import RoleGuard from './page_comps/auth/RoleGuard'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Complaints from './pages/Complaints'
import OneTimeOrder from './pages/OneTimeOrder'
import Services from './pages/Services'
import SetupJob from './pages/SetupJob'
import TrackYourOrder from './pages/TrackYourOrder'
import axiosInstance from './util/AxiosUtil'
import { messaging } from './util/FireBase'
import { FRONTEND_ACCESS_IDS } from './util/FrontendAccess'
import JwtUtil from './util/JwtUtil'
import { swalAlert } from './util/SwalUtil'
import { initializeAccessDetails } from './util/AccessController'

import BankDetailsPage from './deliveryya_dashboard/comps/bankDetails/BankDetailsPage'
import DeliveryFees from './deliveryya_dashboard/comps/deliveryFees/DeliveryFees'
import UrgentJobUpdate from './pages/UrgentJobUpdate'
import CompanyWallet from './deliveryya_dashboard/comps/accounts/CompanyWallet'
import AgentWallet from './deliveryya_dashboard/comps/accounts/AgentWallet'
import Discounts from './deliveryya_dashboard/comps/Discounts'

function LegacyUserAccessRedirect() {
  const { userId } = useParams();
  return <Navigate to={`/deliverYya-cloud-console/access-management/users/${userId ?? ''}`} replace />;
}

function PublicAccessGuard({
  allowedAccessIds,
  children,
}: {
  allowedAccessIds: readonly number[];
  children: ReactNode;
}) {
  const token = localStorage.getItem('jwtToken');
  const isLoggedIn = token ? JwtUtil.validateToken(token) : false;

  if (!isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <RoleGuard allowedAccessIds={allowedAccessIds}>
      {children}
    </RoleGuard>
  );
}

function ConsoleAuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('jwtToken');
  const isAuthenticated = Boolean(token && JwtUtil.validateToken(token));

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to='/sign-in'
        replace
        state={{ returnTo }}
      />
    );
  }

  return <>{children}</>;
}

function App() {
  useEffect(() => {
    navigator.serviceWorker.addEventListener("message", (event) => {

      if (event.data?.type === "REQ_LOCATION") {
        sendLocation();
        return;
      }
    });

    onMessage(messaging, (payload: any) => {

      if (payload.data?.type === "REQ_LOCATION") {
        sendLocation();
        return;
      }

      swalAlert(
        payload.notification?.title ?? "Notification",
        payload.notification?.body ?? "",
        "info"
      );
    });

    const jwtToken = localStorage.getItem('jwtToken');
    if (jwtToken && JwtUtil.validateToken(jwtToken)) {
      void initializeAccessDetails();
    }

  }, []);


  const sendLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Got location:", latitude, longitude);

          axiosInstance.post("/employees/update-current-location", {
            location: `${latitude},${longitude}`
          }).then(() => {
            console.log("Location updated successfully");
          }).catch(err => {
            console.error("Error updating location:", err);
          });
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  }

  return (
    <>
      <div data-theme="light">
        <ScrollToTop />
        <Routes>
          <Route element={<PdfGenerator />} path='/test-genarate-pdf' />
          <Route element={<Home />} path='/' />
          <Route element={<Home />} path='/home' />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.URGENT_JOB_PUBLIC_ACCESS]}>
                <SetupJob />
              </PublicAccessGuard>
            }
            path='/urgent-job'
          />
          <Route element={<About />} path='/about' />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.PRODUCT_ACCESS]}>
                <Store />
              </PublicAccessGuard>
            }
            path='/store'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MARKET_ACCESS]}>
                <AllMarketsP />
              </PublicAccessGuard>
            }
            path='/all-markets'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MARKET_ACCESS]}>
                <MarketProfile />
              </PublicAccessGuard>
            }
            path='/market/:marketId'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.PRODUCT_ACCESS]}>
                <AllProductsP />
              </PublicAccessGuard>
            }
            path='/all-products'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.PRODUCT_ACCESS]}>
                <SingleProductView />
              </PublicAccessGuard>
            }
            path='/product-details/:id'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.AUTH_ACCOUNT_ENTRY_ACCESS]}>
                <SignIn />
              </PublicAccessGuard>
            }
            path='/sign-in'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.AUTH_ACCOUNT_ENTRY_ACCESS]}>
                <SignUp />
              </PublicAccessGuard>
            }
            path='/sign-up'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.TRACK_ORDER_ACCESS]}>
                <TrackYourOrder />
              </PublicAccessGuard>
            }
            path='/track-your-order'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.COMPLAINT_ACCESS]}>
                <Complaints />
              </PublicAccessGuard>
            }
            path='/complaints'
          />
          <Route element={<Services />} path='/services' />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.CHECKOUT_CART_ACCESS]}>
                <Cart />
              </PublicAccessGuard>
            }
            path='/cart'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.CHECKOUT_CART_ACCESS]}>
                <Checkout />
              </PublicAccessGuard>
            }
            path='/checkout'
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.CHECKOUT_CART_ACCESS]}>
                <OneTimeOrder />
              </PublicAccessGuard>
            }
            path='/one-time-order'
          />
          <Route element={<Forbidden />} path='/403' />



          <Route
            element={
              <ConsoleAuthGuard>
                <AdvancePanel />
              </ConsoleAuthGuard>
            }
            path='/deliverYya-cloud-console'
          >
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.PROFILE_PANEL]}>
                  <ProfilePanel />
                </RoleGuard>
              }
              path=''
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.REQUEST_FOR_MARKET]}>
                  <RequestForMarket />
                </RoleGuard>
              }
              path='request-for-market'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.USER_REQUESTS_MANAGE]}>
                  <UserRequestsManager />
                </RoleGuard>
              }
              path='user-requests'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MY_REQUESTS]}>
                  <MyRequestsManager />
                </RoleGuard>
              }
              path='my-requests'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.VIEW_MARKETS]}>
                  <MarketsDirectory />
                </RoleGuard>
              }
              path='markets'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.VIEW_MARKETS]}>
                  <MarketWorkspace />
                </RoleGuard>
              }
              path='markets/:marketId'
            />

            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MY_REQUESTS]}>
                  <Navigate to='/deliverYya-cloud-console/my-requests' replace />
                </RoleGuard>
              }
              path='request-for-user'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MARKET_CATEGORIES]}>
                  <MarketsCategoriesBrandsPage />
                </RoleGuard>
              }
              path='markets/categories'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ORDER_CODE_REQUESTS]}>
                  <OrderCodeRequests />
                </RoleGuard>
              }
              path='ordercode-requests'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MANAGE_USERS]}>
                  <AdminUserStatusTable />
                </RoleGuard>
              }
              path='manage-users'
            />

            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.VERIFY_DOCUMENTS]}>
                  <VerifyDocuments />
                </RoleGuard>
              }
              path='verify-documents'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.CAREER_MANAGEMENT]}>
                  <Career />
                </RoleGuard>
              }
              path='career'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.COMPLAINTS_MANAGEMENT]}>
                  <ComplaintsManager />
                </RoleGuard>
              }
              path='complaints'
            />

            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MY_COMPLAINTS]}>
                  <MyComplaints />
                </RoleGuard>
              }
              path='my-complaints'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.RECEIVING_ORDERS]}>
                  <ReceivingOrders />
                </RoleGuard>
              }
              path='receiving-orders'
            />

            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                  <AccessManagement />
                </RoleGuard>
              }
              path='access-management'
            >
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <Navigate to='accesses' replace />
                  </RoleGuard>
                }
                path=''
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <AccessCatalog />
                  </RoleGuard>
                }
                path='accesses'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <UserRolesPermissions />
                  </RoleGuard>
                }
                path='roles'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <UserRolesPermissions />
                  </RoleGuard>
                }
                path='roles/:roleId'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <UserAccessControl />
                  </RoleGuard>
                }
                path='users'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <UserAccessControl />
                  </RoleGuard>
                }
                path='users/:userId'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <Navigate to='/deliverYya-cloud-console/access-management/users' replace />
                  </RoleGuard>
                }
                path='user-access-control'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT]}>
                    <LegacyUserAccessRedirect />
                  </RoleGuard>
                }
                path='user-access-control/:userId'
              />
            </Route>

            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MY_MARKET_PRODUCTS]}>
                  <MyMarket />
                </RoleGuard>
              }
              path='my-market'
            >
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MY_MARKET_PRODUCTS]}>
                    <ProductsManager />
                  </RoleGuard>
                }
                path=''
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MY_MARKET_PRODUCTS]}>
                    <AddProduct />
                  </RoleGuard>
                }
                path='add-product'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.MY_MARKET_CATEGORIES]}>
                    <CategoryBrandsManager />
                  </RoleGuard>
                }
                path='categories'
              />
            </Route>


            <Route
              element={
                <RoleGuard
                  allowedAccessIds={[
                    FRONTEND_ACCESS_IDS.DASHBOARD,
                    FRONTEND_ACCESS_IDS.DASHBOARD_DELIVERY_COMPANY,
                    FRONTEND_ACCESS_IDS.DASHBOARD_CLIENT_MARKET_OWNER,
                  ]}
                >
                  <Dashboard />
                </RoleGuard>
              }
              path=''
            />
            <Route
              element={
                <RoleGuard
                  allowedAccessIds={[
                    FRONTEND_ACCESS_IDS.DASHBOARD,
                    FRONTEND_ACCESS_IDS.DASHBOARD_DELIVERY_COMPANY,
                    FRONTEND_ACCESS_IDS.DASHBOARD_CLIENT_MARKET_OWNER,
                  ]}
                >
                  <Dashboard />
                </RoleGuard>
              }
              path='dashboard'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ADD_ORDERS]}>
                  <AddOrders />
                </RoleGuard>
              }
              path='add-orders'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.VIEW_PLACED_ORDERS]}>
                  <PlacedOrders />
                </RoleGuard>
              }
              path='placed-orders'
            />
            <Route
              element={
                <RoleGuard
                  allowedAccessIds={[
                    FRONTEND_ACCESS_IDS.ORDER_ANALYTICS,
                    FRONTEND_ACCESS_IDS.ORDER_ANALYTICS_DELIVERY_COMPANY,
                    FRONTEND_ACCESS_IDS.ORDER_ANALYTICS_CLIENT_MARKET_OWNER,
                  ]}
                  unauthorizedMessage='You do not have permission to view Order Analytics.'
                >
                  <OrderAnalytics />
                </RoleGuard>
              }
              path='order-analytics'
            />
            <Route
              element={
                <RoleGuard
                  allowedAccessIds={[
                    FRONTEND_ACCESS_IDS.ACCOUNTS_PANEL,
                    FRONTEND_ACCESS_IDS.ACCOUNTS_DELIVERY_COMPANY,
                    FRONTEND_ACCESS_IDS.ACCOUNTS_CLIENT_MARKET_OWNER,
                  ]}
                >
                  <Accounts />
                </RoleGuard>
              }
              path='accounts'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.COMPANY_WALLET]}>
                  <CompanyWallet />
                </RoleGuard>
              }
              path='company-wallet'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.AGENT_WALLET]}>
                  <AgentWallet />
                </RoleGuard>
              }
              path='agent-wallet'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.DASHBOARD]}>
                  <Discounts />
                </RoleGuard>
              }
              path='discounts'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.BANK_DETAILS]}>
                  <BankDetailsPage />
                </RoleGuard>
              }
              path='bank-details'
            />

            <Route path='employee-assignments'>
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.EMPLOYEE_ASSIGNMENTS]}>
                    <EmployeeAssignmentPanel />
                  </RoleGuard>
                }
                path=''
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.EMPLOYEE_ASSIGNMENTS]}>
                    <EmployeeAssignmentPanel />
                  </RoleGuard>
                }
                path='argent-jobs'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.PICKUP_REQUEST_ASSIGNMENTS]}>
                    <PickupRequestAssignments />
                  </RoleGuard>
                }
                path='pickup-requests'
              />
              <Route
                element={
                  <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ON_HAND_ORDERS]}>
                    <OnHandOrders />
                  </RoleGuard>
                }
                path='on-hand-orders'
              />
            </Route>

            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.PAYMENT_HANDOVER]}>
                  <AgentPaymentHandover />
                </RoleGuard>
              }
              path='agent-payment-handover'
            />


            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.URGENT_JOBS]}>
                  <UrgentJobs />
                </RoleGuard>
              }
              path='urgent-jobs'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.ORDER_CHECKOUT]}>
                  <OrderCheckout />
                </RoleGuard>
              }
              path='order-checkout'
            />
            <Route
              element={
                <RoleGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.DELIVERY_FEES_MANAGEMENT, FRONTEND_ACCESS_IDS.DELIVERY_FEES_VIEW]}>
                  <DeliveryFees />
                </RoleGuard>
              }
              path='delivery-fees'
            />
          </Route>

          {/* <Route element={<DeliveryPanel />} path='/deliveryya-dashboard' >
            <Route element={<Dashboard />} path='' />
            <Route element={<Dashboard />} path='dashboard' />
            <Route element={<AddOrders />} path='add-orders' />
            <Route element={<PlacedOrders />} path='placed-orders' />
            <Route element={<OrderAnalytics />} path='order-analytics' />
            <Route element={<Accounts />} path='accounts' />
            <Route element={<EmployeeAssignmentPanel />} path='employee-assignments' />
            <Route element={<UrgentJobs />} path='urgent-jobs' />
            <Route element={<OrderCheckout />} path='order-checkout' />
            <Route element={<OrderCheckoutConfirmation />} path='order-checkout-confirmation' />
          </Route> */}

          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.URGENT_JOB_PUBLIC_ACCESS]}>
                <UrgentJobUpdate />
              </PublicAccessGuard>
            }
            path="/urgent-job-update"
          />

          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.AUTH_ACCOUNT_ENTRY_ACCESS]}>
                <VerifyEmail />
              </PublicAccessGuard>
            }
            path="/verify-email"
          />
          <Route
            element={
              <PublicAccessGuard allowedAccessIds={[FRONTEND_ACCESS_IDS.AUTH_ACCOUNT_ENTRY_ACCESS]}>
                <ResetPassword />
              </PublicAccessGuard>
            }
            path="/reset-password"
          />
        </Routes>
      </div>
    </>
  )
}

export default App
