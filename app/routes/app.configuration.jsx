import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Layout,
  Page,
  TextField,
  Button,
  Frame,
  Toast,
  ColorPicker,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useSubmit, redirect } from "@remix-run/react";
import { json } from "@remix-run/node";
import prisma from "../db.server";

// Loader and action functions within the same file
export async function loader({ request }) {
  const firstStoreInformation = await prisma.storeInformation.findFirst();

  // Fetch the store information using the ID of the first record
  const storeInformation = await prisma.storeInformation.findUnique({
    where: { id: firstStoreInformation.id },
  });

  return json({ storeInformation });
}

export async function action({ request }) {
  const formData = await request.formData();
  const companyName = formData.get('companyName');
  const domainName = formData.get('domainName');
  const emailContent = formData.get('emailContent');
  const contactNo = formData.get('contactNo');
  const whatsappNo = formData.get('whatsappNo');
  const senderName = formData.get('senderName');
  const email = formData.get('email');
  const companyAddress = formData.get('companyAddress');
  const copyrightYear = formData.get('copyrightYear');
  const hexColor = formData.get('hexColor');
  const emailExpirationDuration = formData.get('emailExpirationDuration');
  const serviceId = formData.get('service_id');
  const templateId = formData.get('template_id');
  const publicKey = formData.get('publicKey');
  const emailMessageTitle = formData.get('emailMessageTitle');

  const firstStoreInformation = await prisma.storeInformation.findFirst();

  try {
    await prisma.storeInformation.upsert({
      where: { id: firstStoreInformation.id },
      update: {
        companyName,
        domainName,
        emailContent,
        contactNo,
        whatsappNo,
        senderName,
        email,
        companyAddress,
        copyRightYear: copyrightYear,
        emailColor: hexColor,
        durationOfEmailExpiration: parseInt(emailExpirationDuration, 10),
        service_id: serviceId,
        template_id: templateId,
        publicKey: publicKey,
        emailMessageTitle: emailMessageTitle,
      },
      create: {
        companyName,
        domainName,
        emailContent,
        contactNo,
        whatsappNo,
        senderName,
        email,
        companyAddress,
        copyRightYear: copyrightYear,
        emailColor: hexColor,
        durationOfEmailExpiration: parseInt(emailExpirationDuration, 10),
        service_id: serviceId,
        template_id: templateId,
        publicKey: publicKey,
        emailMessageTitle: emailMessageTitle,
      },
    });
  } catch (error) {
    console.error(error);
    throw new Error('Failed to save settings');
  }

  return redirect(`/app/configuration`);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  let rHex = r.toString(16).padStart(2, '0');
  let gHex = g.toString(16).padStart(2, '0');
  let bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

export default function SettingsPage() {
  const { storeInformation } = useLoaderData();
  const submit = useSubmit();
  const [toastActive, setToastActive] = useState(false);
  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);
  const [fields, setFields] = useState({
    companyName: '',
    domainName: '',
    emailContent: '',
    contactNo: '',
    whatsappNo: '',
    senderName: '',
    email: '',
    companyAddress: '',
    copyrightYear: '',
    hexColor: '',
    color: {
      hue: 120,
      brightness: 1,
      saturation: 1,
    },
    emailExpirationDuration: '',
    service_id: '',
    template_id: '',
    publicKey: '',
    emailMessageTitle: '',
  });

  useEffect(() => {
    if (storeInformation) {
      setFields({
        companyName: storeInformation.companyName || '',
        domainName: storeInformation.domainName || '',
        emailContent: storeInformation.emailContent || '',
        contactNo: storeInformation.contactNo || '',
        whatsappNo: storeInformation.whatsappNo || '',
        senderName: storeInformation.senderName || '',
        email: storeInformation.email || '',
        companyAddress: storeInformation.companyAddress || '',
        copyrightYear: storeInformation.copyRightYear || '',
        hexColor: storeInformation.emailColor || '',
        color: {
          hue: 120,
          brightness: 1,
          saturation: 1,
        },
        emailExpirationDuration: storeInformation.durationOfEmailExpiration?.toString() || '',
        service_id: storeInformation.service_id || '',
        template_id: storeInformation.template_id || '',
        publicKey: storeInformation.publicKey || '',
        emailMessageTitle: storeInformation.emailMessageTitle || '',
      });
    }
  }, [storeInformation]);

  const handleFieldChange = (field) => (value) => {
    setFields({ ...fields, [field]: value });
  };

  const handleColorChange = (color) => {
    const hexColor = hslToHex(color.hue, color.saturation * 100, color.brightness * 100);
    setFields({ ...fields, color, hexColor });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData();
    Object.keys(fields).forEach((key) => {
      formData.append(key, fields[key]);
    });
    submit(formData, { method: "post" }).then(() => {
      toggleToastActive();
    });
  };

  const toastMarkup = toastActive ? (
    <Toast content="Setting Saved Successfully" onDismiss={toggleToastActive} />
  ) : null;

  return (
    <Frame>
      <TitleBar title="Settings" />
      <Page>
        {toastMarkup}
        <form onSubmit={handleSubmit}>
          <Card sectioned>
            <Layout>
              <Layout.Section oneHalf>
                <TextField
                  label="Company Name"
                  value={fields.companyName}
                  onChange={handleFieldChange('companyName')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Domain Name"
                  value={fields.domainName}
                  onChange={handleFieldChange('domainName')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Email Content"
                  value={fields.emailContent}
                  onChange={handleFieldChange('emailContent')}
                  multiline
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Contact No."
                  value={fields.contactNo}
                  onChange={handleFieldChange('contactNo')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="WhatsApp No."
                  value={fields.whatsappNo}
                  onChange={handleFieldChange('whatsappNo')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Sender Name"
                  value={fields.senderName}
                  onChange={handleFieldChange('senderName')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Email"
                  value={fields.email}
                  onChange={handleFieldChange('email')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Company Address"
                  value={fields.companyAddress}
                  onChange={handleFieldChange('companyAddress')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Copyright Year"
                  value={fields.copyrightYear}
                  onChange={handleFieldChange('copyrightYear')}
                  type="number"
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Color"
                  value={fields.hexColor}
                  onChange={handleFieldChange('hexColor')}
                />
                <ColorPicker
                  onChange={handleColorChange}
                  color={fields.color}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Duration of Email Expiration"
                  value={fields.emailExpirationDuration}
                  onChange={handleFieldChange('emailExpirationDuration')}
                  type="number"
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Service ID"
                  value={fields.service_id}
                  onChange={handleFieldChange('service_id')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Template ID"
                  value={fields.template_id}
                  onChange={handleFieldChange('template_id')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Public Key"
                  value={fields.publicKey}
                  onChange={handleFieldChange('publicKey')}
                />
              </Layout.Section>
              <Layout.Section oneHalf>
                <TextField
                  label="Email Message Title"
                  value={fields.emailMessageTitle}
                  onChange={handleFieldChange('emailMessageTitle')}
                />
              </Layout.Section>
              <Layout.Section>
                <Button primary submit>Save</Button>
              </Layout.Section>
            </Layout>
          </Card>
        </form>
      </Page>
      {toastMarkup}
    </Frame>
  );
}
