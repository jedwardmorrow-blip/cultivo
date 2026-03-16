const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-jspdf-BAYTUK4R.js","assets/vendor-misc-CnSMVh_U.js"])))=>i.map(i=>d[i]);
import{r as i,j as e}from"./vendor-misc-CnSMVh_U.js";import{s as R,g as je,D as Ne,a as ke,b as Ce,d as Se,f as De,h as Te,i as Pe,j as Ae,k as Ee,I as le,n as H,p as te,l as he,m as xe,o as Z,q as ae,r as ee,t as Oe,u as Ie,v as Fe,w as Le,O as Re,x as Me,y as $e,z as ze,A as Ue,B as Be,C as qe}from"./index-CIaBKUsm.js";import{N as Bt,E as qt,F as Ht}from"./index-CIaBKUsm.js";import{_ as ie}from"./vendor-jspdf-BAYTUK4R.js";import{V as He,z as ce,ak as Ge,X as V,Y as Ye,al as Ke,w as se,f as B,af as ge,a0 as pe,P as oe,U as be,am as de,C as Ve,a6 as We,an as Je,ac as Qe,ae as Xe,a9 as Ze,a5 as et,a as tt,o as at,ao as st,ap as rt,J as nt,aq as lt,y as it,a2 as ct}from"./vendor-lucide-C9FUrfos.js";import{u as ot}from"./useShiftSelect-DXgSlocm.js";import{P as dt}from"./PageSkeleton-Cb8jWtNp.js";import"./vendor-react-dom-3TroVnFx.js";import"./vendor-supabase-BfxQvyKY.js";async function mt(t){var $,U,W,J;const[a,n,r]=await Promise.all([R.from("orders").select(`
        id,
        order_number,
        order_date,
        requested_delivery_date,
        scheduled_delivery_date,
        delivery_notes,
        internal_notes,
        total_amount,
        customers:customer_id (
          name,
          license_name,
          license_number,
          ato_number,
          delivery_address,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          address,
          city,
          state,
          postal_code,
          account_credit_balance
        )
      `).eq("id",t).single(),R.from("order_items").select(`
        id,
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        notes,
        batch_id,
        products:product_id (
          name,
          strain,
          pricing_unit,
          product_category,
          type
        )
      `).eq("order_id",t),je()]);if(a.error)throw a.error;if(n.error)throw n.error;const o=a.data,u=n.data||[],s=o.customers,c=Array.from(new Set(u.map(g=>g.batch_id).filter(Boolean))),p=new Map,m=new Map;if(c.length>0){const[g,_]=await Promise.all([R.from("batch_registry").select("id, batch_number, strain, harvest_date").in("id",c),R.from("certificates_of_analysis").select("batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date").in("batch_id",c).eq("is_active",!0)]);($=g.data)==null||$.forEach(A=>{p.set(A.id,A)}),(U=_.data)==null||U.forEach(A=>{A.batch_id&&m.set(A.batch_id,A)})}const x=await R.from("package_assignments").select(`
      order_item_id,
      package_id,
      quantity_assigned,
      status
    `).eq("order_id",t).in("status",["reserved","fulfilled"]),b=new Map;(W=x.data)==null||W.forEach(g=>{const _=b.get(g.order_item_id)||[];b.set(g.order_item_id,[..._,g])});const l=Array.from(new Set(((J=x.data)==null?void 0:J.map(g=>g.package_id))||[]));let h=new Map;if(l.length>0){const{data:g}=await R.from("inventory_items").select("id, package_id, batch, batch_number, sku, net_weight, thc_percentage, strain, batch_id").in("package_id",l);g==null||g.forEach(A=>{h.set(A.package_id,A)});const _=Array.from(new Set((g||[]).map(A=>A.batch_id).filter(Boolean))).filter(A=>!p.has(A));if(_.length>0){const{data:A}=await R.from("batch_registry").select("id, batch_number, strain, harvest_date").in("id",_);A==null||A.forEach(O=>{p.set(O.id,O)});const{data:z}=await R.from("certificates_of_analysis").select("batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date").in("batch_id",_).eq("is_active",!0);z==null||z.forEach(O=>{O.batch_id&&!m.has(O.batch_id)&&m.set(O.batch_id,O)})}}const w=Array.from(new Set(u.map(g=>{var _;return(_=g.products)==null?void 0:_.strain}).filter(Boolean))),C=new Map;if(w.length>0){const{data:g}=await R.from("strains").select("name, dominance_type, genetics_description").in("name",w);g==null||g.forEach(_=>{C.set(_.name,{name:_.name,type:_.dominance_type,genetics:_.genetics_description})})}const f=await Promise.all(u.map(async g=>{const _=g.products,A=b.get(g.id)||[];let z=null,O=null,j=null,F=null;if(g.batch_id){const Y=p.get(g.batch_id);Y&&(O=Y.batch_number,F=Y.harvest_date||null);const L=m.get(g.batch_id);L&&(j=L.thc_percentage,!F&&L.harvest_date&&(F=L.harvest_date))}if(A.length>0){const Y=A[0],L=h.get(Y.package_id);if(L&&(z=L.package_id,O||(O=L.batch_number||L.batch),j||(j=L.thc_percentage),L.batch_id)){const ne=p.get(L.batch_id);ne&&!F&&(F=ne.harvest_date||null);const K=m.get(L.batch_id);K&&(!F&&K.harvest_date&&(F=K.harvest_date),!j&&K.thc_percentage&&(j=K.thc_percentage))}}const G=_==null?void 0:_.strain,q=G?C.get(G):null,re=g.discount_amount||0,we=g.subtotal-re;return{id:g.id,product_name:(_==null?void 0:_.name)||"Unknown Product",package_id:z,batch_number:O,quantity:g.quantity,unit:(_==null?void 0:_.pricing_unit)||"unit",unit_price:g.unit_price,subtotal:g.subtotal,discount:re,total:we,strain:G||null,product_category:(_==null?void 0:_.product_category)||"packaged",strain_dominance:(q==null?void 0:q.type)||null,strain_lineage:(q==null?void 0:q.genetics)||null,thc_percentage:j,harvest_date:F}})),P=f.reduce((g,_)=>g+_.subtotal,0),d=f.reduce((g,_)=>g+_.discount,0),k=(s==null?void 0:s.account_credit_balance)||0,y=P-d-k,D=o.order_number.replace("ORD-","INV-"),S=o.order_number.split("-").pop()||"",v=o.scheduled_delivery_date||o.requested_delivery_date,I=(s==null?void 0:s.license_number)||(s==null?void 0:s.ato_number)||null,T=(s==null?void 0:s.delivery_address)||(s==null?void 0:s.address)||null,E=(s==null?void 0:s.delivery_city)||(s==null?void 0:s.city)||null,M=(s==null?void 0:s.delivery_state)||(s==null?void 0:s.state)||null,N=(s==null?void 0:s.delivery_postal_code)||(s==null?void 0:s.postal_code)||null;return{invoice_number:D,invoice_id:S,order_number:o.order_number,order_date:o.order_date,estimated_delivery_date:v,company_brand_name:r.company_brand_name||Ee,company_entity_name:r.company_entity_name||Ae,company_name:r.company_name||Pe,company_license_name:r.company_license_name||Te,company_address:r.company_address||De,company_city:r.company_city||Se,company_state:r.company_state||Ce,company_postal_code:r.company_postal_code||ke,company_license_number:r.company_license_number||Ne,company_logo_path:r.logo_invoice_url||r.logo_dark_url||"",customer_name:(s==null?void 0:s.name)||"Unknown Customer",customer_license_name:(s==null?void 0:s.license_name)||null,customer_license_number:I,customer_delivery_address:T,customer_delivery_city:E,customer_delivery_state:M,customer_delivery_postal_code:N,line_items:f,subtotal:P,discounts:d,credit:k,grand_total:y,notes:o.internal_notes}}async function ut(t,a={}){const{filename:n="document.pdf",scale:r=2,quality:o=.95}=a;try{const[u,{jsPDF:s}]=await Promise.all([ie(()=>import("./vendor-html2canvas-CBrSDip1.js"),[]),ie(()=>import("./vendor-jspdf-BAYTUK4R.js").then(h=>h.j),__vite__mapDeps([0,1]))]),c=u.default,p=await c(t,{scale:r,useCORS:!0,allowTaint:!1,backgroundColor:"#ffffff",logging:!1,imageTimeout:15e3,onclone:h=>{const w=h.querySelector(".invoice-container");w&&(w.style.transform="scale(1)")}}),m=8.5,x=p.height*m/p.width,b=new s({orientation:(x>11,"portrait"),unit:"in",format:"letter"}),l=p.toDataURL("image/jpeg",o);if(x<=11)b.addImage(l,"JPEG",0,0,m,x);else{let h=x,w=0;const C=11;for(b.addImage(l,"JPEG",0,w,m,x),h-=C;h>0;)w=h-x,b.addPage(),b.addImage(l,"JPEG",0,w,m,x),h-=C}b.save(n)}catch(u){throw console.error("PDF generation error:",u),new Error("Failed to generate PDF. Please try again.")}}function me(t){return t.replace(/[^a-zA-Z0-9-_\s]/g,"").replace(/\s+/g,"_").substring(0,200)}function ht(t,a){const n=me(a),r=me(t),o=new Date().toISOString().split("T")[0];return`${r}_${n}_${o}.pdf`}class xt extends i.Component{constructor(a){super(a),this.state={hasError:!1,error:null}}static getDerivedStateFromError(a){return{hasError:!0,error:a}}componentDidCatch(a,n){console.error("[OrdersErrorBoundary] Caught error:",a,n)}render(){var a;return this.state.hasError?e.jsxs("div",{className:"max-w-7xl mx-auto",children:[e.jsxs("div",{className:"mb-8",children:[e.jsx("h1",{className:"text-4xl font-bold text-cult-white uppercase tracking-wide",children:"Orders & Fulfillment"}),e.jsx("p",{className:"text-cult-light-gray mt-2",children:"Manage orders, allocate inventory, and track fulfillment"})]}),e.jsxs("div",{className:"bg-red-900/20 border-2 border-red-500 p-8 text-center",children:[e.jsx("h2",{className:"text-2xl font-bold text-red-400 mb-4",children:"Something went wrong"}),e.jsx("p",{className:"text-red-300 mb-6",children:((a=this.state.error)==null?void 0:a.message)||"An unexpected error occurred"}),e.jsx("button",{onClick:()=>{this.setState({hasError:!1,error:null}),window.location.reload()},className:"px-6 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray hover:text-cult-white transition-all font-medium uppercase tracking-wider text-sm",children:"Reload Page"})]})]}):this.props.children}}function gt({orderId:t,orderNumber:a,onClose:n}){const[r,o]=i.useState(null),[u,s]=i.useState(!0),[c,p]=i.useState(null),[m,x]=i.useState(!1),[b,l]=i.useState(!1),[h,w]=i.useState(!1),C=i.useRef(null),f=i.useRef(null);i.useEffect(()=>{P()},[t]);async function P(){try{s(!0),p(null);const y=await mt(t);o(y),x(!1)}catch(y){console.error("Error generating invoice:",y),p("Failed to generate invoice. Please try again.")}finally{s(!1)}}i.useEffect(()=>{r&&!u&&setTimeout(()=>{x(!0)},800)},[r,u]);async function d(){var y,D,S;if(!f.current){H.warning("Print area not ready. Please try again.");return}if(!m){H.warning("Please wait for the invoice to finish loading...");return}l(!0);try{const v=document.createElement("iframe");v.style.position="fixed",v.style.right="0",v.style.bottom="0",v.style.width="0",v.style.height="0",v.style.border="none",document.body.appendChild(v);const I=v.contentDocument||((y=v.contentWindow)==null?void 0:y.document);if(!I)throw new Error("Could not access iframe document");const T=`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${(r==null?void 0:r.invoice_number)||a}</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: letter;
              margin: 0.5in;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              background: white !important;
            }
            body {
              font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.5;
              color: #000000;
            }
            img {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              max-width: 100%;
              height: auto;
            }

            /* Utility Classes - Layout */
            .bg-white { background-color: #ffffff !important; }
            .text-black { color: #000000 !important; }
            .p-8 { padding: 2rem; }
            .min-h-[11in] { min-height: 11in; }
            .flex { display: flex; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-0.5, .mt-0 { margin-top: 0.125rem; }
            .ml-8 { margin-left: 2rem; }
            .ml-auto { margin-left: auto; }
            .flex-shrink-0 { flex-shrink: 0; }
            .flex-1 { flex: 1 1 0%; }

            /* Grid */
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-8 { gap: 2rem; }

            /* Text Alignment */
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }

            /* Font Sizes */
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-base { font-size: 1rem; line-height: 1.5rem; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }

            /* Font Weights */
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }

            /* Colors */
            .text-cult-text-muted { color: #374151; }
            .text-cult-text-faint { color: #4B5563; }

            /* Width */
            .w-full { width: 100%; }
            .w-64 { width: 16rem; }
            .w-auto { width: auto; }

            /* Height */
            .h-48 { height: 12rem; }

            /* Padding */
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .pr-4 { padding-right: 1rem; }

            /* Alignment */
            .align-top { vertical-align: top; }

            /* Borders */
            .border-t-2 { border-top-width: 2px; border-top-style: solid; }
            .border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
            .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
            .border-black { border-color: #000000; }

            /* Table Specific */
            table { border-collapse: collapse; width: 100%; }
            th, td { text-align: inherit; }

            /* Specific Invoice Styles */
            .invoice-container {
              background-color: #ffffff;
              color: #000000;
              padding: 2rem;
              min-height: 11in;
              width: 8.5in;
              margin: 0 auto;
            }

            .invoice-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 2rem;
            }

            .invoice-logo {
              flex-shrink: 0;
            }

            .invoice-logo img {
              height: 12rem;
              width: auto;
              margin-bottom: 1rem;
              max-height: 240px;
            }

            .invoice-company-info {
              text-align: right;
            }

            .company-brand-name {
              font-weight: 700;
              font-size: 1.25rem;
              line-height: 1.75rem;
            }

            .company-entity-name {
              font-size: 0.875rem;
              line-height: 1.25rem;
              font-weight: 600;
            }

            .company-license-name {
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .company-license-number {
              font-size: 0.75rem;
              line-height: 1rem;
            }

            .company-address {
              font-size: 0.875rem;
              line-height: 1.25rem;
              margin-top: 0.5rem;
            }

            .invoice-details-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 2rem;
              margin-bottom: 2rem;
            }

            .sold-to-section .section-title {
              font-weight: 700;
              margin-bottom: 0.5rem;
            }

            .sold-to-section .customer-name {
              font-weight: 600;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .sold-to-section .customer-address {
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .sold-to-section .customer-license-info {
              margin-top: 0.5rem;
              font-size: 0.75rem;
              line-height: 1rem;
            }

            .invoice-meta {
              text-align: right;
            }

            .invoice-meta table {
              margin-left: auto;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .invoice-meta td:first-child {
              font-weight: 700;
              padding-right: 1rem;
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
            }

            .invoice-meta td:last-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
            }

            .line-items-table {
              width: 100%;
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              margin-bottom: 1.5rem;
            }

            .line-items-table thead tr {
              border-bottom: 1px solid #000000;
            }

            .line-items-table th {
              text-align: left;
              padding: 0.5rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              font-weight: 700;
            }

            .line-items-table th.text-right {
              text-align: right;
            }

            .line-items-table td {
              padding: 0.5rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              vertical-align: top;
            }

            .line-items-table td.text-right {
              text-align: right;
            }

            .product-name {
              font-weight: 600;
            }

            .strain-info {
              font-size: 0.75rem;
              line-height: 1rem;
              color: #374151;
              margin-top: 0.125rem;
            }

            .batch-info {
              font-size: 0.75rem;
              line-height: 1rem;
              color: #4B5563;
              margin-top: 0.125rem;
              font-weight: 500;
            }

            .line-item-total {
              font-weight: 600;
            }

            .invoice-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }

            .notes-section {
              flex: 1 1 0%;
            }

            .notes-section .notes-title {
              font-weight: 700;
              font-size: 0.875rem;
              line-height: 1.25rem;
              margin-bottom: 0.25rem;
            }

            .notes-section .notes-content {
              font-size: 0.875rem;
              line-height: 1.25rem;
              color: #374151;
            }

            .originator-license {
              margin-top: 1rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .originator-license .label {
              font-weight: 700;
            }

            .totals-section {
              width: 16rem;
              margin-left: 2rem;
            }

            .totals-section table {
              width: 100%;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .totals-section td:first-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
              padding-right: 1rem;
              text-align: right;
              font-weight: 700;
            }

            .totals-section td:last-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
              text-align: right;
            }

            .totals-section .grand-total-row {
              border-top: 2px solid #000000;
            }

            .totals-section .grand-total-row td {
              padding-top: 0.5rem;
              padding-bottom: 0.5rem;
              font-weight: 700;
              font-size: 1rem;
              line-height: 1.5rem;
            }
          </style>
        </head>
        <body>
          ${f.current.innerHTML}
        </body>
        </html>
      `;I.open(),I.write(T),I.close(),await new Promise(N=>setTimeout(N,500));const E=I.getElementsByTagName("img"),M=Array.from(E).map(N=>N.complete&&N.naturalHeight!==0?Promise.resolve():new Promise($=>{const U=setTimeout(()=>$(null),3e3);N.onload=()=>{clearTimeout(U),$(null)},N.onerror=()=>{clearTimeout(U),$(null)}}));await Promise.all(M),await new Promise(N=>setTimeout(N,500)),(D=v.contentWindow)==null||D.focus(),(S=v.contentWindow)==null||S.print(),setTimeout(()=>document.body.removeChild(v),1e3)}catch(v){console.error("Print error:",v),H.error("An error occurred while printing. Please try again.")}finally{l(!1)}}async function k(){if(!f.current||!r){H.warning("Invoice not ready. Please try again.");return}if(!m){H.warning("Please wait for the invoice to finish loading...");return}w(!0);try{const y=ht(r.invoice_number,r.customer_name);await ut(f.current,{filename:y,scale:2,quality:.95})}catch(y){console.error("PDF download error:",y),H.error("Failed to download PDF. Please try again or use the Print button.")}finally{w(!1)}}return e.jsx("div",{className:"fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4",onClick:n,children:e.jsxs("div",{className:"bg-cult-dark-gray border-2 border-cult-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col",onClick:y=>y.stopPropagation(),children:[e.jsxs("div",{className:"flex items-center justify-between p-6 border-b-2 border-cult-medium-gray bg-cult-near-black",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-bold text-cult-white uppercase tracking-wide",children:"Invoice Preview"}),e.jsxs("p",{className:"text-cult-light-gray text-sm mt-1",children:["Order: ",a]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[!u&&!c&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{onClick:d,disabled:!m||b,className:"flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed",title:"Print Invoice",children:[e.jsx(He,{className:"w-4 h-4"}),b?"Printing...":m?"Print":"Loading..."]}),e.jsx("button",{onClick:k,disabled:!m||h,className:"flex items-center gap-2 px-4 py-2 border-2 border-cult-white text-cult-white hover:bg-cult-white hover:text-cult-black transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed",title:"Download PDF",children:h?e.jsxs(e.Fragment,{children:[e.jsx(ce,{className:"w-4 h-4 animate-spin"}),"Generating..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Ge,{className:"w-4 h-4"}),"Download"]})})]}),e.jsx("button",{onClick:n,className:"p-2 text-cult-light-gray hover:text-cult-white hover:bg-cult-medium-gray transition-all",title:"Close",children:e.jsx(V,{className:"w-6 h-6"})})]})]}),e.jsxs("div",{className:"flex-1 overflow-auto p-6 bg-cult-black",children:[u&&e.jsx("div",{className:"flex items-center justify-center h-64",children:e.jsxs("div",{className:"flex flex-col items-center gap-3",children:[e.jsx(ce,{className:"w-8 h-8 text-cult-white animate-spin"}),e.jsx("p",{className:"text-cult-light-gray",children:"Generating invoice..."})]})}),c&&e.jsx("div",{className:"flex items-center justify-center h-64",children:e.jsxs("div",{className:"bg-red-900/30 border-2 border-red-600 text-red-400 p-6 rounded max-w-md text-center",children:[e.jsx("p",{className:"font-semibold mb-2",children:"Error"}),e.jsx("p",{className:"text-sm",children:c}),e.jsx("button",{onClick:P,className:"mt-4 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all text-sm uppercase tracking-wider",children:"Retry"})]})}),!u&&!c&&r&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"flex justify-center",children:e.jsx("div",{className:"shadow-2xl",children:e.jsx(le,{ref:C,invoiceData:r,onImagesLoaded:()=>x(!0)})})}),e.jsx("div",{style:{display:"none"},children:e.jsx(le,{ref:f,invoiceData:r,forPrint:!0})})]})]})]})})}const ue={overdue:0,awaiting_acceptance:1,delivery_soon:2,unfulfilled:3};function fe(t){const a=[],n=new Date,r=t.status||"submitted",o=t.created_at?new Date(t.created_at):n,u=t.scheduled_delivery_date||t.requested_delivery_date,s=te(u),c=s?s.getTime():null,p=(n.getTime()-o.getTime())/(1e3*60*60),m=c?(c-n.getTime())/(1e3*60*60):null,x=["completed","cancelled","delivered"];return x.includes(r)||(r==="submitted"&&p>24&&a.push({type:"awaiting_acceptance",label:"Awaiting acceptance",severity:p>72?"high":"medium"}),c&&m!==null&&m<0&&!x.includes(r)&&a.push({type:"overdue",label:"Overdue",severity:"high"}),c&&m!==null&&m>=0&&m<=48&&!["ready_for_delivery","completed","delivered"].includes(r)&&a.push({type:"delivery_soon",label:"Delivery soon",severity:"medium"}),["accepted","processing"].includes(r)&&(t.item_count||0)>0&&a.push({type:"unfulfilled",label:"Needs fulfillment",severity:"medium"}),a.length<=1)?a:(a.sort((b,l)=>ue[b.type]-ue[l.type]),[a[0]])}function ye(t){return fe(t).length>0}function ve(t){if(!t)return"";const a=new Date,n=new Date(t),r=a.getTime()-n.getTime(),o=Math.floor(r/(1e3*60)),u=Math.floor(r/(1e3*60*60)),s=Math.floor(r/(1e3*60*60*24));return o<60?`${o}m ago`:u<24?`${u}h ago`:s===1?"1d ago":`${s}d ago`}function pt(t,a){if(!t)return"text-cult-silver";const n=new Date,r=new Date(t),o=(n.getTime()-r.getTime())/(1e3*60*60);return a==="submitted"&&o>72?"text-red-400":a==="submitted"&&o>24?"text-amber-400":"text-cult-silver"}function bt({orders:t,filters:a,onFilterChange:n}){const[r,o]=i.useState([]),[u,s]=i.useState(!1);i.useEffect(()=>{async function l(){const{data:h}=await R.from("customers").select("id, name").order("name");h&&o(h)}l()},[]);const c=i.useMemo(()=>{const l={all:t.length,attention:0,submitted:0,accepted:0,processing:0,ready_for_delivery:0,completed:0,cancelled:0};return t.forEach(h=>{const w=h.status||"submitted";l[w]=(l[w]||0)+1,ye(h)&&l.attention++}),l},[t]),p=[{key:"attention",label:"Needs Attention",count:c.attention,colors:"text-red-400 border-red-800/50 bg-red-900/10",activeColors:"text-red-300 border-red-600 bg-red-900/40"},{key:"all",label:"All",count:c.all,colors:"text-cult-silver border-cult-charcoal bg-cult-graphite",activeColors:"text-cult-off-white border-cult-silver bg-cult-charcoal"},{key:"submitted",label:"Submitted",count:c.submitted,colors:"text-blue-400/70 border-blue-800/30 bg-blue-900/5",activeColors:"text-blue-300 border-blue-600 bg-blue-900/30"},{key:"accepted",label:"Accepted",count:c.accepted,colors:"text-cyan-400/70 border-cyan-800/30 bg-cyan-900/5",activeColors:"text-cyan-300 border-cyan-600 bg-cyan-900/30"},{key:"processing",label:"Processing",count:c.processing,colors:"text-yellow-400/70 border-yellow-800/30 bg-yellow-900/5",activeColors:"text-yellow-300 border-yellow-600 bg-yellow-900/30"},{key:"ready_for_delivery",label:"Ready",count:c.ready_for_delivery,colors:"text-green-400/70 border-green-800/30 bg-green-900/5",activeColors:"text-green-300 border-green-600 bg-green-900/30"},{key:"completed",label:"Completed",count:c.completed,colors:"text-emerald-400/70 border-emerald-800/30 bg-emerald-900/5",activeColors:"text-emerald-300 border-emerald-600 bg-emerald-900/30"},{key:"cancelled",label:"Cancelled",count:c.cancelled,colors:"text-red-400/70 border-red-800/30 bg-red-900/5",activeColors:"text-red-300 border-red-600 bg-red-900/30"}],m=l=>{n({...a,...l})},x=a.customerName!==""||a.priority!==""||a.dateFrom!==""||a.dateTo!=="",b=()=>{n({searchTerm:"",status:"all",customerName:"",priority:"",dateFrom:"",dateTo:""}),s(!1)};return e.jsxs("div",{className:"space-y-3 mb-6",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"relative flex-1",children:[e.jsx(Ye,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-cult-silver w-4 h-4"}),e.jsx("input",{type:"text",placeholder:"Search by order number, customer, or product...",value:a.searchTerm,onChange:l=>m({searchTerm:l.target.value}),className:"w-full pl-10 pr-10 py-2.5 bg-cult-near-black border border-cult-charcoal rounded-cult text-cult-off-white placeholder-cult-lighter-gray text-sm focus:outline-none focus:border-cult-green focus:ring-1 focus:ring-cult-green/30 transition-all"}),a.searchTerm&&e.jsx("button",{onClick:()=>m({searchTerm:""}),className:"absolute right-3 top-1/2 -translate-y-1/2 text-cult-lighter-gray hover:text-cult-white transition-colors",children:e.jsx(V,{className:"w-4 h-4"})})]}),e.jsxs("button",{onClick:()=>s(!u),className:`flex items-center gap-1.5 px-3 py-2.5 border rounded-cult text-xs font-semibold uppercase tracking-wider transition-all ${u||x?"bg-cult-charcoal border-cult-silver text-cult-off-white":"bg-cult-near-black border-cult-charcoal text-cult-silver hover:border-cult-silver hover:text-cult-off-white"}`,children:[e.jsx(Ke,{className:"w-3.5 h-3.5"}),"Filters",x&&e.jsx("span",{className:"w-1.5 h-1.5 bg-cult-green rounded-full"})]})]}),e.jsx("div",{className:"flex flex-wrap gap-1.5",children:p.map(l=>{if(l.count===0&&l.key!=="all")return null;const h=a.status===l.key;return e.jsxs("button",{onClick:()=>m({status:l.key}),className:`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded text-[11px] font-semibold uppercase tracking-wider transition-all ${h?l.activeColors:l.colors} hover:opacity-90`,children:[l.key==="attention"&&e.jsx(se,{className:"w-3 h-3"}),l.label,e.jsx("span",{className:`ml-0.5 ${h?"opacity-100":"opacity-60"}`,children:l.count})]},l.key)})}),u&&e.jsxs("div",{className:"bg-cult-near-black border border-cult-charcoal rounded-cult p-4 animate-fade-in",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-4 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5",children:"Customer"}),e.jsxs("select",{value:a.customerName,onChange:l=>m({customerName:l.target.value}),className:"w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all",children:[e.jsx("option",{value:"",children:"All Customers"}),r.map(l=>e.jsx("option",{value:l.name,children:l.name},l.id))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5",children:"Priority"}),e.jsxs("select",{value:a.priority,onChange:l=>m({priority:l.target.value}),className:"w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all",children:[e.jsx("option",{value:"",children:"All Priorities"}),e.jsx("option",{value:"normal",children:"Normal"}),e.jsx("option",{value:"high",children:"High"}),e.jsx("option",{value:"urgent",children:"Urgent"})]})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block text-[10px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5",children:[e.jsx(B,{className:"w-3 h-3 inline mr-1"}),"Delivery From"]}),e.jsx("input",{type:"date",value:a.dateFrom,onChange:l=>m({dateFrom:l.target.value}),className:"w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all",style:{colorScheme:"dark"}})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block text-[10px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5",children:[e.jsx(B,{className:"w-3 h-3 inline mr-1"}),"Delivery To"]}),e.jsx("input",{type:"date",value:a.dateTo,onChange:l=>m({dateTo:l.target.value}),className:"w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all",style:{colorScheme:"dark"}})]})]}),x&&e.jsx("button",{onClick:b,className:"mt-3 text-xs text-cult-silver hover:text-cult-green transition-colors underline",children:"Clear all filters"})]})]})}const ft={submitted:"Submitted",accepted:"Accepted",processing:"Processing",ready_for_delivery:"Ready",completed:"Completed",cancelled:"Cancelled"};function yt({flag:t}){const a=t.severity==="high"?"bg-red-900/40 text-red-400 border-red-700":"bg-amber-900/30 text-amber-400 border-amber-700";return e.jsxs("span",{className:`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded ${a}`,children:[e.jsx(se,{className:"w-2.5 h-2.5"}),t.label]})}function vt({field:t,currentField:a,direction:n}){return t!==a?e.jsx(de,{className:"w-3 h-3 text-cult-medium-gray"}):n==="asc"?e.jsx(de,{className:"w-3 h-3 text-cult-white"}):e.jsx(Ve,{className:"w-3 h-3 text-cult-white"})}function _t({orders:t,selectedOrderId:a,selectedIds:n,onSelectOrder:r,onSelectionChange:o,onToggleSelectAll:u,onStatusChange:s}){const[c,p]=i.useState("created_at"),[m,x]=i.useState("desc"),b=i.useCallback(d=>{c===d?x(k=>k==="asc"?"desc":"asc"):(p(d),x("asc"))},[c]),l=i.useMemo(()=>{const d=[...t];return d.sort((k,y)=>{let D=0;switch(c){case"order_number":D=(k.order_number||"").localeCompare(y.order_number||"");break;case"customer_name":D=(k.customer_name||"").localeCompare(y.customer_name||"");break;case"status":{const S=["submitted","accepted","processing","ready_for_delivery","completed","cancelled"];D=S.indexOf(k.status||"")-S.indexOf(y.status||"");break}case"delivery_date":{const S=k.scheduled_delivery_date||k.requested_delivery_date||"",v=y.scheduled_delivery_date||y.requested_delivery_date||"";if(!S&&v)return 1;if(S&&!v)return-1;D=S.localeCompare(v);break}case"total_amount":D=(k.total_amount||0)-(y.total_amount||0);break;case"created_at":D=(k.created_at||"").localeCompare(y.created_at||"");break}return m==="asc"?D:-D}),d},[t,c,m]),h=i.useCallback(d=>d.id,[]),{handleItemClick:w}=ot({items:l,getKey:h,selectedIds:n,onSelectionChange:o}),C=t.length>0&&n.size===t.length,f="px-3 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wide cursor-pointer hover:text-cult-white transition-colors select-none",P=(d,k,y)=>e.jsx("th",{className:`${f} ${y==="right"?"text-right":""}`,onClick:()=>b(d),children:e.jsxs("span",{className:"inline-flex items-center gap-1",children:[k,e.jsx(vt,{field:d,currentField:c,direction:m})]})});return e.jsxs("div",{className:"bg-cult-graphite border border-cult-charcoal rounded-cult overflow-hidden",children:[e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-cult-charcoal bg-cult-near-black",children:[e.jsx("th",{className:"w-10 px-3 py-3",children:e.jsx("input",{type:"checkbox",checked:C,onChange:u,className:"w-3.5 h-3.5 rounded border-cult-charcoal bg-cult-near-black text-cult-green focus:ring-cult-green/50 focus:ring-offset-0 cursor-pointer accent-emerald-500"})}),P("order_number","Order"),P("status","Status"),P("customer_name","Customer"),P("delivery_date","Delivery"),e.jsx("th",{className:f,children:"Items"}),P("total_amount","Total","right"),P("created_at","Entered"),e.jsx("th",{className:`${f} w-8`})]})}),e.jsx("tbody",{className:"divide-y divide-cult-charcoal/60",children:l.map(d=>{var M;const k=a===d.id,y=n.has(d.id),D=fe(d),S=d.scheduled_delivery_date||d.requested_delivery_date,v=ve(d.created_at),I=pt(d.created_at,d.status),T=he(d.status||"submitted"),E=xe(d.status||"submitted");return e.jsxs("tr",{onClick:()=>r(d.id),className:`cursor-pointer transition-all duration-150 group ${k?"bg-cult-charcoal/80 border-l-2 border-l-cult-green":"hover:bg-cult-graphite/80 border-l-2 border-l-transparent"}`,children:[e.jsx("td",{className:"px-3 py-3",onClick:N=>N.stopPropagation(),children:e.jsx("input",{type:"checkbox",checked:y,onChange:N=>w(d.id,N.nativeEvent instanceof MouseEvent&&N.nativeEvent.shiftKey),className:"w-3.5 h-3.5 rounded border-cult-charcoal bg-cult-near-black text-cult-green focus:ring-cult-green/50 focus:ring-offset-0 cursor-pointer accent-emerald-500"})}),e.jsxs("td",{className:"px-3 py-3",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm font-bold text-cult-off-white tracking-wide",children:d.order_number}),d.is_sample&&e.jsxs("span",{className:"inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded uppercase",children:[e.jsx(ge,{className:"w-2.5 h-2.5"}),"Sample"]}),d.priority==="urgent"&&e.jsx("span",{className:"px-1.5 py-0.5 text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-700 rounded uppercase",children:"Urgent"}),d.priority==="high"&&e.jsx("span",{className:"px-1.5 py-0.5 text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-700 rounded uppercase",children:"High"})]}),D.length>0&&e.jsx("div",{className:"flex flex-wrap gap-1 mt-1",children:D.map((N,$)=>e.jsx(yt,{flag:N},$))})]}),e.jsx("td",{className:"px-3 py-3",onClick:N=>N.stopPropagation(),children:e.jsxs("div",{className:"inline-flex items-center gap-1",children:[e.jsx("span",{className:`inline-block px-2 py-1 text-[11px] font-bold border rounded uppercase tracking-wider select-none ${T}`,children:ft[d.status||"submitted"]||d.status}),s&&E&&e.jsx("button",{title:Z(d.status||"submitted",E),onClick:N=>{N.stopPropagation(),s(d.id,E)},className:"p-1 rounded hover:bg-white/10 transition-all text-cult-lighter-gray hover:text-cult-green opacity-0 group-hover:opacity-100",children:e.jsx(pe,{className:"w-3.5 h-3.5"})})]})}),e.jsx("td",{className:"px-3 py-3",children:e.jsx("span",{className:"text-sm text-cult-off-white",children:d.customer_name||"Unknown"})}),e.jsx("td",{className:"px-3 py-3",children:S?e.jsxs("span",{className:"text-sm text-cult-silver flex items-center gap-1.5",children:[e.jsx(B,{className:"w-3 h-3 text-cult-lighter-gray"}),((M=te(S))==null?void 0:M.toLocaleDateString("en-US",{month:"short",day:"numeric"}))??"No date"]}):e.jsx("span",{className:"text-xs text-cult-lighter-gray",children:"No date"})}),e.jsx("td",{className:"px-3 py-3",children:e.jsxs("span",{className:"text-sm text-cult-silver flex items-center gap-1.5",children:[e.jsx(oe,{className:"w-3 h-3 text-cult-lighter-gray"}),d.item_count||0]})}),e.jsx("td",{className:"px-3 py-3 text-right",children:e.jsx("span",{className:"text-sm font-semibold text-green-400",children:ae(d.total_amount||0)})}),e.jsx("td",{className:"px-3 py-3",children:d.created_at?e.jsxs("div",{children:[e.jsxs("span",{className:"text-sm text-cult-silver flex items-center gap-1.5",children:[e.jsx(B,{className:"w-3 h-3 text-cult-lighter-gray"}),new Date(d.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})]}),e.jsx("span",{className:`text-[10px] ${I} ml-4.5`,children:v})]}):e.jsx("span",{className:"text-xs text-cult-lighter-gray",children:"--"})}),e.jsx("td",{className:"px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity",children:e.jsx(be,{className:"w-3.5 h-3.5 text-cult-silver hover:text-cult-white cursor-pointer",title:"Clone order"})})]},d.id)})})]})}),l.length===0&&e.jsxs("div",{className:"py-16 text-center",children:[e.jsx(oe,{className:"w-12 h-12 text-cult-charcoal mx-auto mb-3"}),e.jsx("p",{className:"text-cult-silver text-sm",children:"No orders match your filters"})]})]})}function Q({title:t,message:a,confirmLabel:n,variant:r="default",onConfirm:o,onCancel:u}){i.useEffect(()=>{const p=m=>{m.key==="Escape"&&u()};return document.addEventListener("keydown",p),()=>document.removeEventListener("keydown",p)},[u]);const s=r==="danger"?"bg-red-600 hover:bg-red-700 text-white":r==="warning"?"bg-amber-600 hover:bg-amber-700 text-white":"bg-cult-green hover:bg-cult-green-bright text-cult-black",c=r==="danger"?"text-red-400 bg-red-900/30":r==="warning"?"text-amber-400 bg-amber-900/30":"text-cult-green bg-cult-green/10";return e.jsx("div",{className:"fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4",children:e.jsxs("div",{className:"bg-cult-near-black border border-cult-charcoal rounded-cult max-w-md w-full shadow-2xl animate-fade-in",children:[e.jsx("div",{className:"p-6",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:`p-2 rounded-full flex-shrink-0 ${c}`,children:e.jsx(se,{className:"w-5 h-5"})}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-base font-bold text-cult-off-white mb-2",children:t}),e.jsx("p",{className:"text-sm text-cult-silver leading-relaxed",children:a})]})]})}),e.jsxs("div",{className:"px-6 py-4 border-t border-cult-charcoal flex items-center justify-end gap-3",children:[e.jsx("button",{onClick:u,className:"px-4 py-2 text-sm font-semibold text-cult-silver hover:text-cult-white bg-cult-charcoal hover:bg-cult-medium-gray rounded transition-all",children:"Cancel"}),e.jsx("button",{onClick:o,className:`px-4 py-2 text-sm font-bold rounded transition-all ${s}`,children:n})]})]})})}const wt={"submitted->accepted":"Confirms the order and begins fulfillment planning.","accepted->processing":"Indicates batch allocation and processing have started.","processing->ready_for_delivery":"All items prepared. Ready for manifest and delivery.","ready_for_delivery->completed":"Inventory will be permanently deducted for all assigned packages."};function jt({order:t,onStatusUpdate:a,onUpdateDeliveryDate:n}){const[r,o]=i.useState(!1),[u,s]=i.useState(!1),[c,p]=i.useState(null),[m,x]=i.useState(!1),[b,l]=i.useState(""),h=t.status||"submitted",w=xe(h),C=Oe(h),f=h==="cancelled",P=h==="completed",d=t.scheduled_delivery_date||t.requested_delivery_date,k=async v=>{if(Ie(h,v)&&!d){x(!0);return}p(v);try{await a(t.id,v)}finally{p(null)}},y=async()=>{if(b){p("ready_for_delivery");try{await n(t.id,b),await a(t.id,"ready_for_delivery")}finally{p(null),x(!1),l("")}}},D=w?`${h}->${w}`:"",S=wt[D]||"";return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"bg-cult-near-black border border-cult-charcoal rounded-cult p-4 space-y-3",children:[e.jsx("h4",{className:"text-[11px] font-semibold text-cult-silver uppercase tracking-wider",children:"Status Actions"}),m&&e.jsxs("div",{className:"bg-amber-900/15 border border-amber-700/50 rounded-cult p-3 space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-2 text-amber-400 text-xs font-semibold",children:[e.jsx(B,{className:"w-3.5 h-3.5"}),"Delivery date required"]}),e.jsx("p",{className:"text-xs text-cult-silver",children:"Set a delivery date before marking this order as ready."}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("input",{type:"date",value:b,onChange:v=>l(v.target.value),className:"flex-1 px-3 py-1.5 bg-cult-black border border-cult-charcoal rounded text-xs text-cult-off-white focus:outline-none focus:border-cult-green"}),e.jsx("button",{onClick:y,disabled:!b||!!c,className:"px-3 py-1.5 bg-cult-green text-cult-black text-xs font-bold rounded hover:bg-cult-green-bright transition-all disabled:opacity-40 disabled:cursor-not-allowed",children:c?"Updating...":"Set & Advance"}),e.jsx("button",{onClick:()=>{x(!1),l("")},className:"px-2 py-1.5 text-xs text-cult-silver hover:text-cult-white transition-colors",children:"Cancel"})]})]}),f?e.jsxs("button",{onClick:()=>s(!0),disabled:!!c,className:"w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-cult transition-all disabled:opacity-40",children:[e.jsx(We,{className:"w-4 h-4"}),c==="submitted"?"Reopening...":"Reopen Order"]}):e.jsxs(e.Fragment,{children:[w&&!m&&e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs("button",{onClick:()=>k(w),disabled:!!c,className:"w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cult-green hover:bg-cult-green-bright text-cult-black text-sm font-bold rounded-cult transition-all disabled:opacity-40",children:[e.jsx(pe,{className:"w-4 h-4"}),c===w?"Updating...":Z(h,w)]}),S&&e.jsx("p",{className:"text-[11px] text-cult-lighter-gray leading-relaxed px-1",children:S})]}),C&&e.jsxs("button",{onClick:()=>k(C),disabled:!!c,className:"w-full flex items-center justify-center gap-2 px-4 py-2 border border-cult-charcoal text-cult-silver hover:text-cult-white hover:border-cult-medium-gray text-xs font-semibold rounded-cult transition-all disabled:opacity-40",children:[e.jsx(Je,{className:"w-3.5 h-3.5"}),c===C?"Reverting...":Z(h,C)]}),!P&&e.jsxs("button",{onClick:()=>o(!0),disabled:!!c,className:"w-full flex items-center justify-center gap-1.5 px-4 py-1.5 text-red-400 hover:text-red-300 text-xs font-semibold transition-all disabled:opacity-40",children:[e.jsx(Qe,{className:"w-3.5 h-3.5"}),"Cancel Order"]}),P&&!C&&null]})]}),r&&e.jsx(Q,{title:"Cancel Order",message:`Cancel order ${t.order_number}${t.customer_name?` for ${t.customer_name}`:""}? Any reserved inventory will be released back to available stock.`,confirmLabel:"Cancel Order",variant:"danger",onConfirm:async()=>{o(!1),p("cancelled");try{await a(t.id,"cancelled")}finally{p(null)}},onCancel:()=>o(!1)}),u&&e.jsx(Q,{title:"Reopen Order",message:`Reopen order ${t.order_number}? It will be moved back to ${ee("submitted")} status.`,confirmLabel:"Reopen Order",variant:"default",onConfirm:async()=>{s(!1),p("submitted");try{await a(t.id,"submitted")}finally{p(null)}},onCancel:()=>s(!1)})]})}const _e={submitted:"Submitted",accepted:"Accepted",processing:"Processing",ready_for_delivery:"Ready for Delivery",completed:"Completed",cancelled:"Cancelled"},X=["submitted","accepted","processing","ready_for_delivery","completed"];function Nt({currentStatus:t}){const a=X.indexOf(t);return t==="cancelled"?e.jsxs("div",{className:"flex items-center gap-1 px-4 py-2 bg-red-900/20 border border-red-800/50 rounded",children:[e.jsx(V,{className:"w-3.5 h-3.5 text-red-400"}),e.jsx("span",{className:"text-xs font-semibold text-red-400 uppercase tracking-wider",children:"Cancelled"})]}):e.jsx("div",{className:"flex items-center gap-0.5 overflow-x-auto py-1",children:X.map((n,r)=>{var s;const o=r<=a,u=r===a;return e.jsxs("div",{className:"flex items-center",children:[e.jsx("div",{className:`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${u?"bg-cult-green/20 text-cult-green border border-cult-green/40":o?"bg-cult-charcoal text-cult-silver":"bg-transparent text-cult-lighter-gray/50"}`,children:((s=_e[n])==null?void 0:s.replace("for Delivery",""))||n}),r<X.length-1&&e.jsx(tt,{className:`w-3 h-3 flex-shrink-0 ${o?"text-cult-silver":"text-cult-charcoal"}`})]},n)})})}function kt({customer:t}){const a=[t.delivery_address,t.delivery_city,t.delivery_state,t.delivery_postal_code].filter(Boolean).join(", ")||t.address||"No address";return e.jsxs("div",{className:"bg-cult-near-black border border-cult-charcoal rounded-cult p-4",children:[e.jsxs("div",{className:"flex items-start justify-between mb-3",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(at,{className:"w-4 h-4 text-cult-silver"}),e.jsx("h4",{className:"text-sm font-bold text-cult-off-white",children:t.name})]}),t.order_count!==void 0&&e.jsxs("span",{className:"text-[10px] text-cult-silver bg-cult-charcoal px-2 py-0.5 rounded",children:[t.order_count," orders"]})]}),e.jsxs("div",{className:"space-y-2 text-xs",children:[t.contact_name&&e.jsx("div",{className:"text-cult-silver",children:t.contact_name}),e.jsxs("div",{className:"flex items-start gap-2 text-cult-silver",children:[e.jsx(st,{className:"w-3 h-3 mt-0.5 flex-shrink-0 text-cult-lighter-gray"}),e.jsx("span",{children:a})]}),t.phone&&e.jsxs("a",{href:`tel:${t.phone}`,className:"flex items-center gap-2 text-cult-silver hover:text-cult-green transition-colors",children:[e.jsx(rt,{className:"w-3 h-3 text-cult-lighter-gray"}),t.phone]}),t.email&&e.jsxs("a",{href:`mailto:${t.email}`,className:"flex items-center gap-2 text-cult-silver hover:text-cult-green transition-colors",children:[e.jsx(nt,{className:"w-3 h-3 text-cult-lighter-gray"}),t.email]}),t.license_number&&e.jsxs("div",{className:"flex items-center gap-2 text-cult-silver",children:[e.jsx(lt,{className:"w-3 h-3 text-cult-lighter-gray"}),"License: ",t.license_number]}),t.account_credit_balance!=null&&t.account_credit_balance!==0&&e.jsxs("div",{className:`flex items-center gap-2 font-semibold ${t.account_credit_balance>0?"text-green-400":"text-red-400"}`,children:[e.jsx("span",{className:"text-cult-lighter-gray",children:"Credit:"}),ae(t.account_credit_balance)]})]})]})}function Ct({order:t,products:a,onClose:n,onStatusUpdate:r,onDeleteOrder:o,onUpdateDeliveryDate:u,onItemStatusUpdate:s,onItemQuantityUpdate:c,onItemPriceUpdate:p,onItemBatchUpdate:m,onItemSampleToggle:x,onItemDelete:b,onAddItem:l,onGenerateInvoice:h,onCloneOrder:w}){var z,O;const[C,f]=i.useState(null),[P,d]=i.useState(!1),[k,y]=i.useState(!1),[D,S]=i.useState(""),[v,I]=i.useState(!1),T=i.useRef(null),{orderDetails:E,loading:M}=Fe(),N=t.scheduled_delivery_date||t.requested_delivery_date,$=i.useCallback(async j=>{j&&j!==N&&(await u(t.id,j),I(!0),setTimeout(()=>I(!1),2e3)),y(!1),S("")},[N,u,t.id]),U=i.useCallback(()=>{y(!0),S(Le(N))},[N]),W=(E==null?void 0:E.get(t.id))||[],J=((z=M==null?void 0:M.orderDetails)==null?void 0:z.has(t.id))||!1,g=i.useCallback(async()=>{if(!t.id)return;const{data:j}=await R.from("orders").select("customer_id").eq("id",t.id).maybeSingle();if(!(j!=null&&j.customer_id))return;const[F,G]=await Promise.all([R.from("customers").select("id, name, contact_name, phone, email, address, delivery_address, delivery_city, delivery_state, delivery_postal_code, license_number, license_name, account_credit_balance, dispensary_code").eq("id",j.customer_id).maybeSingle(),R.from("orders").select("id",{count:"exact",head:!0}).eq("customer_id",j.customer_id)]);F.data&&f({...F.data,order_count:G.count||0})},[t.id]);i.useEffect(()=>{g()},[g]),i.useEffect(()=>{const j=F=>{F.key==="Escape"&&n()};return document.addEventListener("keydown",j),()=>document.removeEventListener("keydown",j)},[n]);const _=async()=>{await o(t.id),n()},A=he(t.status||"submitted");return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"fixed inset-0 bg-black/40 z-40",onClick:n}),e.jsxs("div",{className:"fixed top-0 right-0 h-full w-full max-w-2xl bg-cult-black border-l border-cult-charcoal z-50 flex flex-col animate-slide-in-right shadow-2xl",children:[e.jsxs("div",{className:"flex items-center justify-between px-5 py-4 border-b border-cult-charcoal bg-cult-near-black",children:[e.jsxs("div",{className:"flex items-center gap-3 min-w-0",children:[e.jsx("h2",{className:"text-lg font-bold text-cult-off-white tracking-wide truncate",children:t.order_number}),e.jsx("span",{className:`px-2.5 py-1 text-[11px] font-bold border rounded uppercase tracking-wider select-none ${A}`,children:_e[t.status||"submitted"]||t.status}),t.is_sample&&e.jsxs("span",{className:"px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded uppercase flex items-center gap-1",children:[e.jsx(ge,{className:"w-3 h-3"}),"Sample"]}),t.priority==="urgent"&&e.jsx("span",{className:"px-2 py-0.5 text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-700 rounded uppercase",children:"Urgent"}),t.priority==="high"&&e.jsx("span",{className:"px-2 py-0.5 text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-700 rounded uppercase",children:"High"})]}),e.jsx("button",{onClick:n,className:"p-1.5 text-cult-silver hover:text-cult-white hover:bg-cult-charcoal rounded transition-colors",children:e.jsx(V,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"flex-1 overflow-y-auto",children:e.jsxs("div",{className:"px-5 py-4 space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between text-xs text-cult-silver",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(Xe,{className:"w-3 h-3"}),"Created ",ve(t.created_at)]}),k?e.jsxs("span",{className:"flex items-center gap-1",onClick:j=>j.stopPropagation(),children:[e.jsx(B,{className:"w-3 h-3"}),e.jsx("input",{ref:T,type:"date",value:D,onChange:j=>S(j.target.value),onBlur:j=>$(j.target.value),onKeyDown:j=>{j.key==="Enter"&&$(D),j.key==="Escape"&&(y(!1),S(""))},autoFocus:!0,className:"bg-cult-charcoal border border-cult-silver/30 rounded px-1.5 py-0.5 text-xs text-cult-off-white outline-none focus:border-cult-green transition-colors",style:{colorScheme:"dark"}})]}):e.jsxs("button",{onClick:j=>{j.stopPropagation(),U()},className:"flex items-center gap-1 hover:text-cult-green transition-colors group/date",children:[v?e.jsx(Ze,{className:"w-3 h-3 text-cult-green"}):e.jsx(B,{className:"w-3 h-3"}),N?e.jsxs("span",{className:v?"text-cult-green transition-colors":"",children:["Delivery: ",((O=te(N))==null?void 0:O.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}))??"No date",v&&e.jsx("span",{className:"ml-1.5 text-cult-green font-semibold animate-pulse",children:"Saved"})]}):e.jsx("span",{className:"text-cult-lighter-gray group-hover/date:text-cult-green",children:"Set delivery date"})]})]}),e.jsx("span",{className:"font-bold text-green-400 text-sm",children:ae(t.total_amount||0)})]}),e.jsx(Nt,{currentStatus:t.status||"submitted"}),e.jsx(jt,{order:t,onStatusUpdate:r,onUpdateDeliveryDate:u}),C&&e.jsx(kt,{customer:C}),e.jsx(Re,{order:t,items:W,products:a,isLoading:J,onItemStatusUpdate:s,onItemQuantityUpdate:c,onItemPriceUpdate:p,onItemBatchUpdate:m,onItemSampleToggle:x,onItemDelete:b,onAddItem:l,onGenerateInvoice:h}),(t.internal_notes||t.delivery_notes)&&e.jsxs("div",{className:"space-y-3 pt-2",children:[t.delivery_notes&&e.jsxs("div",{children:[e.jsx("h4",{className:"text-[11px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5",children:"Delivery Notes"}),e.jsx("p",{className:"text-xs text-cult-silver bg-cult-near-black border border-cult-charcoal rounded-cult p-3",children:t.delivery_notes})]}),t.internal_notes&&e.jsxs("div",{children:[e.jsx("h4",{className:"text-[11px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5",children:"Internal Notes"}),e.jsx("p",{className:"text-xs text-cult-silver bg-cult-near-black border border-cult-charcoal rounded-cult p-3",children:t.internal_notes})]})]})]})}),e.jsxs("div",{className:"px-5 py-3 border-t border-cult-charcoal bg-cult-near-black flex items-center gap-2",children:[e.jsxs("button",{onClick:()=>w(t),className:"flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cult-silver hover:text-cult-white bg-cult-charcoal hover:bg-cult-medium-gray rounded transition-all uppercase tracking-wider",children:[e.jsx(be,{className:"w-3.5 h-3.5"}),"Clone"]}),e.jsxs("button",{onClick:()=>d(!0),className:"flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 rounded transition-all uppercase tracking-wider ml-auto",children:[e.jsx(et,{className:"w-3.5 h-3.5"}),"Delete"]})]})]}),P&&e.jsx(Q,{title:"Delete Order",message:`Are you sure you want to delete order ${t.order_number}${t.customer_name?` for ${t.customer_name}`:""}? This action cannot be undone.`,confirmLabel:"Delete Order",variant:"danger",onConfirm:_,onCancel:()=>d(!1)})]})}function St({selectedCount:t,selectedOrders:a,onBulkStatusChange:n,onClearSelection:r}){const[o,u]=i.useState(""),[s,c]=i.useState(!1),[p,m]=i.useState(!1),x=a.map(f=>f.status||"submitted"),b=i.useMemo(()=>Me(x),[x.join(",")]),l=i.useMemo(()=>$e(x),[x.join(",")]),h=x.every(f=>f!=="cancelled"),w=async()=>{if(o){if(o==="cancelled"){m(!0);return}c(!0);try{await n(o),u("")}finally{c(!1)}}},C=b.length>0||l.length>0||h;return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-slide-in",children:e.jsxs("div",{className:"flex items-center gap-3 bg-cult-near-black border border-cult-charcoal rounded-cult px-5 py-3 shadow-2xl shadow-black/60",children:[e.jsxs("span",{className:"text-sm font-bold text-cult-off-white",children:[t," selected"]}),e.jsx("div",{className:"w-px h-5 bg-cult-charcoal"}),C?e.jsxs("select",{value:o,onChange:f=>u(f.target.value),className:"px-3 py-1.5 bg-cult-black border border-cult-charcoal rounded-cult text-xs text-cult-off-white focus:outline-none focus:border-cult-green transition-all",children:[e.jsx("option",{value:"",children:"Change status to..."}),b.length>0&&e.jsx("optgroup",{label:"Advance",children:b.map(f=>e.jsx("option",{value:f,children:ee(f)},f))}),l.length>0&&e.jsx("optgroup",{label:"Revert",children:l.map(f=>e.jsx("option",{value:f,children:ee(f)},f))}),h&&e.jsx("optgroup",{label:"Other",children:e.jsx("option",{value:"cancelled",children:"Cancel"})})]}):e.jsx("span",{className:"text-xs text-cult-lighter-gray",children:"No common transitions"}),e.jsxs("button",{onClick:w,disabled:!o||s,className:"flex items-center gap-1.5 px-4 py-1.5 bg-cult-green text-cult-black text-xs font-bold rounded transition-all hover:bg-cult-green-bright disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider",children:[e.jsx(it,{className:"w-3.5 h-3.5"}),s?"Applying...":"Apply"]}),e.jsx("button",{onClick:r,className:"p-1.5 text-cult-silver hover:text-cult-white transition-colors",children:e.jsx(V,{className:"w-4 h-4"})})]})}),p&&e.jsx(Q,{title:"Cancel Selected Orders",message:`Cancel ${t} selected order${t>1?"s":""}? This action will mark them all as cancelled.`,confirmLabel:`Cancel ${t} Order${t>1?"s":""}`,variant:"danger",onConfirm:async()=>{m(!1),c(!0);try{await n("cancelled"),u("")}finally{c(!1)}},onCancel:()=>m(!1)})]})}function Dt(t,a){return i.useMemo(()=>t.filter(n=>{if(a.searchTerm){const r=a.searchTerm.toLowerCase();if(!((n.order_number||"").toLowerCase().includes(r)||(n.customer_name||"").toLowerCase().includes(r)))return!1}if(a.status==="attention"){if(!ye(n))return!1}else if(a.status&&a.status!=="all"&&n.status!==a.status)return!1;if(a.customerName&&n.customer_name!==a.customerName||a.priority&&(n.priority||"normal")!==a.priority)return!1;if(a.dateFrom||a.dateTo){const r=n.scheduled_delivery_date||n.requested_delivery_date;if(!r)return!1;const o=r.substring(0,10);if(a.dateFrom&&o<a.dateFrom||a.dateTo&&o>a.dateTo)return!1}return!0}),[t,a])}const Tt={searchTerm:"",status:"all",customerName:"",priority:"",dateFrom:"",dateTo:""};function Pt({onCreateOrder:t,onSelectOrder:a}){const{orders:n,loading:r,error:o}=ze(),{products:u}=Ue(),s=Be(),[c,p]=i.useState(Tt),[m,x]=i.useState(null),[b,l]=i.useState(new Set),[h,w]=i.useState(!1),[C,f]=i.useState(null),P=Dt(n,c),d=i.useMemo(()=>n.find(T=>T.id===m)||null,[n,m]),k=i.useCallback(T=>{x(T),a(T),s.loadOrderDetails(T)},[a,s]),y=i.useCallback(()=>{x(null)},[]),D=i.useCallback(()=>{l(T=>T.size===P.length?new Set:new Set(P.map(E=>E.id)))},[P]),S=i.useCallback(async T=>{const E=Array.from(b).map(M=>s.updateOrderStatus(M,T));await Promise.all(E),l(new Set)},[b,s]),v=i.useCallback((T,E)=>{f({id:T,number:E}),w(!0)},[]),I=i.useCallback(T=>{t(T),x(null)},[t]);return r?e.jsx(dt,{variant:"table"}):o?e.jsxs("div",{className:"max-w-7xl mx-auto",children:[e.jsx("div",{className:"mb-8",children:e.jsx("h1",{className:"text-3xl font-bold text-cult-white uppercase tracking-wide",children:"DISTRIBUTION"})}),e.jsxs("div",{className:"bg-red-900/20 border border-red-800/50 rounded-cult p-8 text-center",children:[e.jsx("p",{className:"text-red-400 text-sm mb-4",children:o.message}),e.jsx("button",{onClick:()=>s.loadOrders(!0),className:"px-5 py-2 bg-cult-off-white text-cult-black rounded-cult hover:bg-cult-silver transition-all text-sm font-semibold",children:"Retry"})]})]}):e.jsxs("div",{className:"max-w-7xl mx-auto",children:[e.jsxs("div",{className:"mb-6 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold text-cult-white uppercase tracking-wide",children:"DISTRIBUTION"}),e.jsxs("p",{className:"text-cult-light-gray text-sm mt-2",children:[n.length," total orders"]})]}),e.jsxs("button",{onClick:()=>t(),className:"flex items-center gap-2 px-4 py-2.5 bg-cult-green text-cult-black rounded-cult hover:bg-cult-green-bright transition-all text-sm font-bold shadow-lg hover:shadow-cult-green/20",children:[e.jsx(ct,{className:"w-4 h-4"}),"New Order"]})]}),e.jsx(bt,{orders:n,filters:c,onFilterChange:p}),e.jsx(_t,{orders:P,selectedOrderId:m,selectedIds:b,onSelectOrder:k,onSelectionChange:l,onToggleSelectAll:D,onStatusChange:s.updateOrderStatus}),d&&e.jsx(Ct,{order:d,products:u,onClose:y,onStatusUpdate:s.updateOrderStatus,onDeleteOrder:s.deleteOrder,onUpdateDeliveryDate:s.updateDeliveryDate,onItemStatusUpdate:s.updateItemStatus,onItemQuantityUpdate:s.updateItemQuantity,onItemPriceUpdate:s.updateItemPrice,onItemBatchUpdate:s.updateItemBatch,onItemSampleToggle:s.updateItemSample,onItemDelete:s.deleteOrderItem,onAddItem:s.addItemToOrder,onGenerateInvoice:v,onCloneOrder:I}),b.size>0&&e.jsx(St,{selectedCount:b.size,selectedOrders:n.filter(T=>b.has(T.id)),onBulkStatusChange:S,onClearSelection:()=>l(new Set)}),h&&C&&e.jsx(gt,{orderId:C.id,orderNumber:C.number,onClose:()=>{w(!1),f(null)}})]})}function $t({onCreateOrder:t,onSelectOrder:a,selectedOrderId:n,includeArchived:r=!1}){return e.jsx(xt,{children:e.jsx(qe,{includeArchived:r,children:e.jsx(Pt,{onCreateOrder:t,onSelectOrder:a,selectedOrderId:n})})})}export{Bt as NewOrderForm,$t as OrdersContainer,qe as OrdersProvider,Be as useOrderActions,qt as useOrderDetails,Ht as useOrderExpansion,ze as useOrderList,Fe as useOrdersContext,Ue as useProducts};
