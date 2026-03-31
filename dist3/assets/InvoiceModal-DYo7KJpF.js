import{r as p,o as i}from"./vendor-misc-Ia9t9XUU.js";import{s as u,by as ie,bz as ne,bA as ae,bB as re,bC as oe,bD as se,bE as le,bF as ce,bG as de,bH as me,bI as Q,a6 as C,bJ as ge,bK as he}from"./index-PlMGImBf.js";import{Y as pe,z as Z,ap as fe,X as ue}from"./vendor-lucide-BUhifh7Y.js";async function _e(v){var A,M,$,J;const[j,P,a]=await Promise.all([u.from("orders").select(`
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
      `).eq("id",v).single(),u.from("order_items").select(`
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
          type,
          net_weight
        )
      `).eq("order_id",v),ie()]);if(j.error)throw j.error;if(P.error)throw P.error;const m=j.data,f=P.data||[],e=m.customers,_=Array.from(new Set(f.map(t=>t.batch_id).filter(Boolean))),b=new Map,d=new Map;if(_.length>0){const[t,n]=await Promise.all([u.from("batch_registry").select("id, batch_number, strain, harvest_date").in("id",_),u.from("certificates_of_analysis").select("batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date").in("batch_id",_).eq("is_active",!0)]);(A=t.data)==null||A.forEach(o=>{b.set(o.id,o)}),(M=n.data)==null||M.forEach(o=>{o.batch_id&&d.set(o.batch_id,o)})}const k=await u.from("package_assignments").select(`
      order_item_id,
      package_id,
      quantity_assigned,
      status
    `).eq("order_id",v).in("status",["reserved","fulfilled"]),N=new Map;($=k.data)==null||$.forEach(t=>{const n=N.get(t.order_item_id)||[];N.set(t.order_item_id,[...n,t])});const F=Array.from(new Set(((J=k.data)==null?void 0:J.map(t=>t.package_id))||[]));let S=new Map;if(F.length>0){const{data:t}=await u.from("inventory_items").select("id, package_id, batch, batch_number, sku, net_weight, thc_percentage, strain, batch_id").in("package_id",F);t==null||t.forEach(o=>{S.set(o.package_id,o)});const n=Array.from(new Set((t||[]).map(o=>o.batch_id).filter(Boolean))).filter(o=>!b.has(o));if(n.length>0){const{data:o}=await u.from("batch_registry").select("id, batch_number, strain, harvest_date").in("id",n);o==null||o.forEach(c=>{b.set(c.id,c)});const{data:D}=await u.from("certificates_of_analysis").select("batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date").in("batch_id",n).eq("is_active",!0);D==null||D.forEach(c=>{c.batch_id&&!d.has(c.batch_id)&&d.set(c.batch_id,c)})}}const L=Array.from(new Set(f.map(t=>{var n;return(n=t.products)==null?void 0:n.strain}).filter(Boolean))),U=new Map;if(L.length>0){const{data:t}=await u.from("strains").select("name, dominance_type, genetics_description").in("name",L);t==null||t.forEach(n=>{U.set(n.name,{name:n.name,type:n.dominance_type,genetics:n.genetics_description})})}const g=await Promise.all(f.map(async t=>{const n=t.products,o=N.get(t.id)||[];let D=null,c=null,T=null,x=null;if(t.batch_id){const R=b.get(t.batch_id);R&&(c=R.batch_number,x=R.harvest_date||null);const l=d.get(t.batch_id);l&&(T=l.thc_percentage,!x&&l.harvest_date&&(x=l.harvest_date))}if(o.length>0){const R=o[0],l=S.get(R.package_id);if(l&&(D=l.package_id,c||(c=l.batch_number||l.batch),T||(T=l.thc_percentage),l.batch_id)){const X=b.get(l.batch_id);X&&!x&&(x=X.harvest_date||null);const B=d.get(l.batch_id);B&&(!x&&B.harvest_date&&(x=B.harvest_date),!T&&B.thc_percentage&&(T=B.thc_percentage))}}const G=n==null?void 0:n.strain,z=G?U.get(G):null,K=t.discount_amount||0,ee=t.subtotal-K,V=(n==null?void 0:n.net_weight)||0,te=V*t.quantity;return{id:t.id,product_name:(n==null?void 0:n.name)||"Unknown Product",package_id:D,batch_number:c,quantity:t.quantity,unit:(n==null?void 0:n.pricing_unit)||"unit",unit_price:t.unit_price,unit_weight:V,total_weight:te,subtotal:t.subtotal,discount:K,total:ee,strain:G||null,product_category:(n==null?void 0:n.product_category)||"packaged",strain_dominance:(z==null?void 0:z.type)||null,strain_lineage:(z==null?void 0:z.genetics)||null,thc_percentage:T,harvest_date:x}})),I=g.reduce((t,n)=>t+n.subtotal,0),q=g.reduce((t,n)=>t+n.discount,0),O=(e==null?void 0:e.account_credit_balance)||0,r=I-q-O,y=m.order_number.replace("ORD-","INV-"),E=m.order_number.split("-").pop()||"",s=m.scheduled_delivery_date||m.requested_delivery_date,w=(e==null?void 0:e.license_number)||(e==null?void 0:e.ato_number)||null,Y=(e==null?void 0:e.delivery_address)||(e==null?void 0:e.address)||null,W=(e==null?void 0:e.delivery_city)||(e==null?void 0:e.city)||null,H=(e==null?void 0:e.delivery_state)||(e==null?void 0:e.state)||null,h=(e==null?void 0:e.delivery_postal_code)||(e==null?void 0:e.postal_code)||null;return{invoice_number:y,invoice_id:E,order_number:m.order_number,order_date:m.order_date,estimated_delivery_date:s,company_brand_name:a.company_brand_name||me,company_entity_name:a.company_entity_name||de,company_name:a.company_name||ce,company_license_name:a.company_license_name||le,company_address:a.company_address||se,company_city:a.company_city||oe,company_state:a.company_state||re,company_postal_code:a.company_postal_code||ae,company_license_number:a.company_license_number||ne,company_logo_path:a.logo_invoice_url||a.logo_dark_url||"",customer_name:(e==null?void 0:e.name)||"Unknown Customer",customer_license_name:(e==null?void 0:e.license_name)||null,customer_license_number:w,customer_delivery_address:Y,customer_delivery_city:W,customer_delivery_state:H,customer_delivery_postal_code:h,line_items:g,subtotal:I,discounts:q,credit:O,grand_total:r,notes:m.internal_notes}}function we({orderId:v,orderNumber:j,onClose:P}){const[a,m]=p.useState(null),[f,e]=p.useState(!0),[_,b]=p.useState(null),[d,k]=p.useState(!1),[N,F]=p.useState(!1),[S,L]=p.useState(!1),U=p.useRef(null),g=p.useRef(null);p.useEffect(()=>{I()},[v]);async function I(){try{e(!0),b(null);const r=await _e(v);m(r),k(!1)}catch(r){console.error("Error generating invoice:",r),b("Failed to generate invoice. Please try again.")}finally{e(!1)}}p.useEffect(()=>{a&&!f&&setTimeout(()=>{k(!0)},800)},[a,f]);async function q(){var r,y,E;if(!g.current){C.warning("Print area not ready. Please try again.");return}if(!d){C.warning("Please wait for the invoice to finish loading...");return}F(!0);try{const s=document.createElement("iframe");s.style.position="fixed",s.style.right="0",s.style.bottom="0",s.style.width="0",s.style.height="0",s.style.border="none",document.body.appendChild(s);const w=s.contentDocument||((r=s.contentWindow)==null?void 0:r.document);if(!w)throw new Error("Could not access iframe document");const Y=`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${(a==null?void 0:a.invoice_number)||j}</title>
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
          ${g.current.innerHTML}
        </body>
        </html>
      `;w.open(),w.write(Y),w.close(),await new Promise(h=>setTimeout(h,500));const W=w.getElementsByTagName("img"),H=Array.from(W).map(h=>h.complete&&h.naturalHeight!==0?Promise.resolve():new Promise(A=>{const M=setTimeout(()=>A(null),3e3);h.onload=()=>{clearTimeout(M),A(null)},h.onerror=()=>{clearTimeout(M),A(null)}}));await Promise.all(H),await new Promise(h=>setTimeout(h,500)),(y=s.contentWindow)==null||y.focus(),(E=s.contentWindow)==null||E.print(),setTimeout(()=>document.body.removeChild(s),1e3)}catch(s){console.error("Print error:",s),C.error("An error occurred while printing. Please try again.")}finally{F(!1)}}async function O(){if(!g.current||!a){C.warning("Invoice not ready. Please try again.");return}if(!d){C.warning("Please wait for the invoice to finish loading...");return}L(!0);const r=g.current.parentElement;r&&(r.style.display="block",r.style.position="absolute",r.style.left="-9999px",r.style.top="0");try{await new Promise(E=>setTimeout(E,100));const y=ge(a.invoice_number,a.customer_name);await he(g.current,{filename:y,scale:2,quality:.95})}catch(y){console.error("PDF download error:",y),C.error("Failed to download PDF. Please try again or use the Print button.")}finally{r&&(r.style.display="none",r.style.position="",r.style.left="",r.style.top=""),L(!1)}}return i.jsx("div",{className:"fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4",onClick:P,children:i.jsxs("div",{className:"bg-cult-dark-gray border-2 border-cult-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col",onClick:r=>r.stopPropagation(),children:[i.jsxs("div",{className:"flex items-center justify-between p-6 border-b-2 border-cult-medium-gray bg-cult-near-black",children:[i.jsxs("div",{children:[i.jsx("h2",{className:"text-2xl font-bold text-cult-white uppercase tracking-wide",children:"Invoice Preview"}),i.jsxs("p",{className:"text-cult-light-gray text-sm mt-1",children:["Order: ",j]})]}),i.jsxs("div",{className:"flex items-center gap-3",children:[!f&&!_&&i.jsxs(i.Fragment,{children:[i.jsxs("button",{onClick:q,disabled:!d||N,className:"flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed",title:"Print Invoice",children:[i.jsx(pe,{className:"w-4 h-4"}),N?"Printing...":d?"Print":"Loading..."]}),i.jsx("button",{onClick:O,disabled:!d||S,className:"flex items-center gap-2 px-4 py-2 border-2 border-cult-white text-cult-white hover:bg-cult-white hover:text-cult-black transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed",title:"Download PDF",children:S?i.jsxs(i.Fragment,{children:[i.jsx(Z,{className:"w-4 h-4 animate-spin"}),"Generating..."]}):i.jsxs(i.Fragment,{children:[i.jsx(fe,{className:"w-4 h-4"}),"Download"]})})]}),i.jsx("button",{onClick:P,className:"p-2 text-cult-light-gray hover:text-cult-white hover:bg-cult-medium-gray transition-all",title:"Close",children:i.jsx(ue,{className:"w-6 h-6"})})]})]}),i.jsxs("div",{className:"flex-1 overflow-auto p-6 bg-cult-black",children:[f&&i.jsx("div",{className:"flex items-center justify-center h-64",children:i.jsxs("div",{className:"flex flex-col items-center gap-3",children:[i.jsx(Z,{className:"w-8 h-8 text-cult-white animate-spin"}),i.jsx("p",{className:"text-cult-light-gray",children:"Generating invoice..."})]})}),_&&i.jsx("div",{className:"flex items-center justify-center h-64",children:i.jsxs("div",{className:"bg-red-900/30 border-2 border-red-600 text-red-400 p-6 rounded max-w-md text-center",children:[i.jsx("p",{className:"font-semibold mb-2",children:"Error"}),i.jsx("p",{className:"text-sm",children:_}),i.jsx("button",{onClick:I,className:"mt-4 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all text-sm uppercase tracking-wider",children:"Retry"})]})}),!f&&!_&&a&&i.jsxs(i.Fragment,{children:[i.jsx("div",{className:"flex justify-center",children:i.jsx("div",{className:"shadow-2xl",children:i.jsx(Q,{ref:U,invoiceData:a,onImagesLoaded:()=>k(!0)})})}),i.jsx("div",{style:{display:"none"},children:i.jsx(Q,{ref:g,invoiceData:a,forPrint:!0})})]})]})]})})}export{we as I};
