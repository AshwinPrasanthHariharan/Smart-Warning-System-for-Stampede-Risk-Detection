from pydrive2.auth import GoogleAuth
from pydrive2.drive import GoogleDrive
import shutil

DATASET_DIR = "dataset"
ZIP_FILE = "dataset.zip"
FILE_ID = "1g-FZzbF0DrDnuMsVXcWh5t3xKAJ9b-N1"

print("Zipping dataset...")

shutil.make_archive("dataset", "zip", DATASET_DIR)

print("Authenticating...")

gauth = GoogleAuth()
gauth.LocalWebserverAuth()

drive = GoogleDrive(gauth)

print("Uploading dataset...")

file = drive.CreateFile({'id': FILE_ID})
file.SetContentFile(ZIP_FILE)
file.Upload()

print("Dataset pushed to Google Drive.")